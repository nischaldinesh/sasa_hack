import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ATTENDANCE,
  CROWD,
  DAY,
  DEMO,
  EVENTS,
  FRIEND_REQUESTS,
  FRIENDSHIPS,
  PAST_TRIPS,
  attendanceRow,
  isDemoEmail,
  profileRow,
} from "./demoData";

// Puts one demo account back to its `npm run seed` state, so the next person
// can run the demo from the start. Pass a service role client (server only).
// Other accounts' swipes on this account are cleared too, so it reappears in
// their decks; event counts follow from attendance automatically.
export async function resetDemoAccount(admin: SupabaseClient, email: string): Promise<void> {
  const me = DEMO.find((u) => u.email === email.toLowerCase());
  if (!me || !isDemoEmail(email)) throw new Error("Only demo accounts can be reset.");

  const fail = (label: string, error: { message: string } | null) => {
    if (error) throw new Error(`${label}: ${error.message}`);
  };

  // Ids for every seeded person this account is linked to.
  const { data: people, error: peopleError } = await admin
    .from("profiles")
    .select("id, email")
    .in(
      "email",
      [...DEMO, ...CROWD].map((u) => u.email),
    );
  fail("profiles", peopleError);
  const ids = new Map((people ?? []).map((p) => [p.email as string, p.id as string]));
  const myId = ids.get(me.email);
  if (!myId) throw new Error("Demo account not found. Run npm run seed.");

  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id, title, start_time")
    .in(
      "title",
      EVENTS.map((e) => e.title),
    );
  fail("events", eventsError);
  const eventByKey = new Map(
    EVENTS.map((e) => [
      e.key,
      (events ?? []).find((row) => row.title === e.title) as { id: string; start_time: string } | undefined,
    ]),
  );
  if ([...eventByKey.values()].some((e) => !e)) throw new Error("Demo events are missing. Run npm run seed.");
  const event = (key: string) => eventByKey.get(key)!;

  // 1. Clear everything this account did. Deleting the trips it drives
  //    removes their riders; removing it as a rider frees that seat.
  for (const [table, column] of [
    ["attendance", "user_id"],
    ["swipes", "from_user"],
    ["swipes", "to_user"],
    ["trips", "driver_id"],
    ["trip_riders", "rider_id"],
    ["event_skips", "user_id"],
    ["friends", "user_a"],
    ["friends", "user_b"],
    ["friend_requests", "from_user"],
    ["friend_requests", "to_user"],
    ["reviews", "reviewer_id"],
    ["reviews", "reviewee_id"],
  ] as const) {
    const { error } = await admin.from(table).delete().eq(column, myId);
    fail(`clear ${table}`, error);
  }

  // 2. Profile, verification and bell back to the seeded values.
  const { error: profileError } = await admin.from("profiles").update(profileRow(me, myId)).eq("id", myId);
  fail("profile", profileError);

  // 3. Seeded joins and interests.
  const now = Date.now();
  const rows = ATTENDANCE.flatMap((a, n) =>
    a.email === me.email ? [attendanceRow(a, n, myId, event(a.event).id, event(a.event).start_time, now)] : [],
  );
  if (rows.length) {
    const { error } = await admin.from("attendance").insert(rows, { defaultToNull: false });
    fail("attendance", error);
  }

  // 4. Friendships and pending friend requests this account is part of.
  const friendRows = FRIENDSHIPS.filter((pair) => pair.includes(me.email)).flatMap(([a, b]) => {
    const [user_a, user_b] = [ids.get(a), ids.get(b)].sort() as [string | undefined, string | undefined];
    return user_a && user_b ? [{ user_a, user_b }] : [];
  });
  if (friendRows.length) {
    const { error } = await admin
      .from("friends")
      .upsert(friendRows, { onConflict: "user_a,user_b", ignoreDuplicates: true });
    fail("friends", error);
  }
  const requestRows = FRIEND_REQUESTS.filter((pair) => pair.includes(me.email)).flatMap(([from, to]) => {
    const from_user = ids.get(from);
    const to_user = ids.get(to);
    return from_user && to_user ? [{ from_user, to_user, status: "pending" }] : [];
  });
  if (requestRows.length) {
    const { error } = await admin.from("friend_requests").upsert(requestRows, { onConflict: "from_user,to_user" });
    fail("friend requests", error);
  }

  // 5. Past trips with reviews, as driver or as rider.
  const kickoff = event("kickoff").id;
  const matchedAt = new Date(now - 22 * DAY).toISOString();
  const reviewedAt = new Date(now - 20 * DAY).toISOString();
  for (const t of PAST_TRIPS) {
    const driverId = ids.get(t.driver);
    if (!driverId) continue;
    const mine = t.driver === me.email ? t.riders : t.riders.filter((r) => r.email === me.email);
    if (mine.length === 0) continue;

    let { data: trip } = await admin
      .from("trips")
      .select("id")
      .eq("event_id", kickoff)
      .eq("driver_id", driverId)
      .maybeSingle();
    if (!trip) {
      const created = await admin
        .from("trips")
        .insert({ event_id: kickoff, driver_id: driverId, cost_mode: "split" })
        .select("id")
        .single();
      fail("past trip", created.error);
      trip = created.data;
    }
    const riders = mine.flatMap((r) => (ids.get(r.email) ? [{ ...r, id: ids.get(r.email)! }] : []));
    const { error: ridersError } = await admin.from("trip_riders").upsert(
      riders.map((r) => ({ trip_id: trip!.id, rider_id: r.id, event_id: kickoff, matched_at: matchedAt })),
      { onConflict: "trip_id,rider_id", ignoreDuplicates: true },
    );
    fail("past riders", ridersError);
    const { error: reviewsError } = await admin.from("reviews").upsert(
      riders.map((r) => ({
        trip_id: trip!.id,
        reviewer_id: r.id,
        reviewee_id: driverId,
        rating: r.rating,
        comment: r.comment,
        created_at: reviewedAt,
      })),
      { onConflict: "trip_id,reviewer_id" },
    );
    fail("reviews", reviewsError);
  }
}
