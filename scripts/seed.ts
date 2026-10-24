// Seeds demo users, crowd users, events, attendance and friendships.
// Requires supabase/schema.sql and supabase/m4.sql through m6.sql.
// Safe to run repeatedly: users are reused, seeded rows are deleted and re-inserted.
// Usage: npm run seed
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  ATTENDANCE,
  CROWD,
  DEMO,
  EVENTS,
  FRIEND_REQUESTS,
  FRIENDSHIPS,
  LEGACY_TITLES,
  PASSWORD,
  PAST_TRIPS,
  DAY,
  attendanceRow,
  profileRow,
} from "../lib/demoData";
import { chicagoToUtc, chicagoToday } from "../lib/time";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Wall clock time in America/Chicago, daysFromNow days after today in Chicago.
// Uses the correct UTC offset on each date, so events after Nov 1 are in CST.
function eventTime(daysFromNow: number, hour: number, minute = 0): Date {
  const today = chicagoToday();
  return chicagoToUtc(today.year, today.month, today.day + daysFromNow, hour, minute);
}

// Event photo at public/events/<key>.jpg when one exists; otherwise the app
// shows the category illustration.
function eventImage(key: string): string | null {
  return existsSync(`public/events/${key}.jpg`) ? `/events/${key}.jpg` : null;
}

function check<T>(label: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data as T;
}

async function findUsersByEmail(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list users: ${error.message}`);
    for (const u of data.users) if (u.email) ids.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return ids;
}

async function seedUsers(): Promise<Map<string, string>> {
  const existing = await findUsersByEmail();
  const ids = new Map<string, string>();
  const demoEmails = new Set(DEMO.map((u) => u.email));

  for (const u of [...DEMO, ...CROWD]) {
    const meta = { name: u.name, major: u.major };
    let id = existing.get(u.email);
    if (id && demoEmails.has(u.email)) {
      // Reset demo passwords in case they were changed during a demo.
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: meta,
      });
      if (error) throw new Error(`update ${u.email}: ${error.message}`);
    } else if (!id) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: meta,
      });
      if (error) throw new Error(`create ${u.email}: ${error.message}`);
      id = data.user.id;
    }
    ids.set(u.email, id);
  }

  check(
    "upsert profiles",
    await supabase.from("profiles").upsert([...DEMO, ...CROWD].map((u) => profileRow(u, ids.get(u.email)!))),
  );

  return ids;
}

async function seedEvents(): Promise<Map<string, string>> {
  // Deleting seeded events cascades to their attendance, swipes, trips and trip riders.
  check(
    "delete seeded events",
    await supabase
      .from("events")
      .delete()
      .in("title", [...EVENTS.map((e) => e.title), ...LEGACY_TITLES]),
  );

  const rows = check(
    "insert events",
    await supabase
      .from("events")
      .insert(
        EVENTS.map((e) => {
          const start = eventTime(e.daysFromNow, e.start[0], e.start[1]);
          return {
            title: e.title,
            organization: e.organization,
            category: e.category,
            location: e.location,
            city: e.city,
            lat: e.lat,
            lng: e.lng,
            start_time: start.toISOString(),
            end_time: new Date(start.getTime() + e.hours * 60 * 60 * 1000).toISOString(),
            tags: e.tags,
            requires_registration: e.registrationUrl !== null,
            registration_url: e.registrationUrl,
            driver_perk: e.driverPerk ?? null,
            description: e.description ?? null,
            image_url: eventImage(e.key),
          };
        }),
      )
      .select("id, title"),
  ) as { id: string; title: string }[];

  const ids = new Map<string, string>();
  for (const e of EVENTS) {
    const row = rows.find((r) => r.title === e.title);
    if (!row) throw new Error(`event not inserted: ${e.title}`);
    ids.set(e.key, row.id);
  }
  return ids;
}

async function clearUserRows(userIds: string[]) {
  // Clear seeded users' rows on any other events (e.g. joined during a demo run).
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
    check(`delete ${table}.${column}`, await supabase.from(table).delete().in(column, userIds));
  }
}

async function seedAttendance(users: Map<string, string>, events: Map<string, string>) {
  const byKey = new Map(EVENTS.map((e) => [e.key, e]));
  const now = Date.now();

  const rows = ATTENDANCE.map((a, n) => {
    const ev = byKey.get(a.event)!;
    const start = eventTime(ev.daysFromNow, ev.start[0], ev.start[1]).toISOString();
    return attendanceRow(a, n, users.get(a.email)!, events.get(a.event)!, start, now);
  });

  for (let i = 0; i < rows.length; i += 100) {
    // Rows differ in shape (interested rows have no ride fields); defaultToNull: false
    // lets missing columns take their defaults (e.g. split_gas) instead of null.
    check(
      "insert attendance",
      await supabase.from("attendance").insert(rows.slice(i, i + 100), { defaultToNull: false }),
    );
  }
}

async function seedFriends(users: Map<string, string>) {
  const rows = FRIENDSHIPS.map(([e1, e2]) => {
    const [a, b] = [users.get(e1)!, users.get(e2)!].sort();
    return { user_a: a, user_b: b };
  });
  check("insert friends", await supabase.from("friends").insert(rows));
}

async function seedPastTrips(users: Map<string, string>, events: Map<string, string>) {
  const eventId = events.get("kickoff")!;
  const matchedAt = new Date(Date.now() - 22 * DAY).toISOString();
  for (const t of PAST_TRIPS) {
    const driverId = users.get(t.driver)!;
    const [trip] = check(
      "insert past trip",
      await supabase.from("trips").insert({ event_id: eventId, driver_id: driverId, cost_mode: "split" }).select("id"),
    ) as { id: string }[];
    check(
      "insert past riders",
      await supabase
        .from("trip_riders")
        .insert(
          t.riders.map((r) => ({
            trip_id: trip.id,
            rider_id: users.get(r.email)!,
            event_id: eventId,
            matched_at: matchedAt,
          })),
        ),
    );
    check(
      "insert reviews",
      await supabase.from("reviews").insert(
        t.riders.map((r) => ({
          trip_id: trip.id,
          reviewer_id: users.get(r.email)!,
          reviewee_id: driverId,
          rating: r.rating,
          comment: r.comment,
          created_at: new Date(Date.now() - 20 * DAY).toISOString(),
        })),
      ),
    );
  }
}

async function seedFriendRequests(users: Map<string, string>) {
  check(
    "insert friend requests",
    await supabase
      .from("friend_requests")
      .insert(FRIEND_REQUESTS.map(([from, to]) => ({ from_user: users.get(from)!, to_user: users.get(to)! }))),
  );
}

async function main() {
  const users = await seedUsers();
  console.log(`users: ${DEMO.length} demo + ${CROWD.length} crowd`);
  await clearUserRows([...users.values()]);
  const events = await seedEvents();
  console.log(`events: ${events.size}`);
  await seedAttendance(users, events);
  console.log(`attendance: ${ATTENDANCE.length}`);
  await seedFriends(users);
  console.log(`friendships: ${FRIENDSHIPS.length}`);
  await seedPastTrips(users, events);
  console.log(`past trips with reviews: ${PAST_TRIPS.length}`);
  await seedFriendRequests(users);
  console.log(`pending friend requests: ${FRIEND_REQUESTS.length}`);
  console.log(`Done. Demo password: ${PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
