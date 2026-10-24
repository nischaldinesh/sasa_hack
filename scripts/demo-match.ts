// Simulates the M3 match flow against the real database using the same code
// as POST /api/swipe (lib/match.ts) and the event page deck (lib/queries.ts).
//
// 1. rider3 and driver1 swipe right on each other for the OKC career fair -> match.
// 2. rider2 and rider4 also match with driver1 until all 3 seats are taken.
// 3. Checks a full car disappears from rider1's deck (S4) and that one more
//    mutual right swipe is refused with { full: true }.
// 4. Last seat race (M4): two riders race for driver2's last seat, once through
//    recordSwipe and once with raw concurrent inserts; only one may win.
//
// Changes demo data. Run `npm run seed` afterwards to reset.
// Usage: npm run demo:match
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { isTripFull, recordSwipe, type SwipeResult } from "../lib/match";
import { getPersonDeck } from "../lib/queries";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const EVENT_TITLE = "OU Career Fair — OKC";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

async function userId(email: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("id").eq("email", email).single();
  if (error) throw new Error(`${email}: ${error.message}. Run npm run seed first.`);
  return data.id;
}

async function mutualMatch(driver: string, rider: string, eventId: string, label: string) {
  const first = await recordSwipe(admin, rider, { toUser: driver, eventId, direction: "right" });
  check(`${label}: first right swipe does not match yet`, !first.matched, first);
  const second: SwipeResult = await recordSwipe(admin, driver, { toUser: rider, eventId, direction: "right" });
  return second;
}

async function main() {
  const { data: event, error } = await admin.from("events").select("id").eq("title", EVENT_TITLE).single();
  if (error) throw new Error(`event: ${error.message}. Run npm run seed first.`);
  const eventId: string = event.id;

  const [driver1, driver2, rider1, rider2, rider3, rider4] = await Promise.all(
    ["driver1", "driver2", "rider1", "rider2", "rider3", "rider4"].map((u) => userId(`${u}@ou.edu`)),
  );

  // Start clean for this event so the script is repeatable.
  await admin.from("trips").delete().eq("event_id", eventId);
  await admin.from("swipes").delete().eq("event_id", eventId);

  const seats = (
    await admin.from("attendance").select("seats").eq("event_id", eventId).eq("user_id", driver1).single()
  ).data?.seats;
  check("driver1 offers 3 seats", seats === 3, { seats });

  // 1. driver1 <-> rider3
  const match = await mutualMatch(driver1, rider3, eventId, "driver1 + rider3");
  check("driver1 + rider3: second right swipe matches", match.matched === true, match);
  const tripId = match.matched ? match.tripId : "";
  const { data: inTrip } = await admin.from("trip_riders").select("rider_id").eq("trip_id", tripId);
  check("rider3 is in driver1's trip", inTrip?.some((r) => r.rider_id === rider3) ?? false);

  const rider3Deck = await getPersonDeck(admin, rider3, eventId);
  check("rider3 now sees their trip instead of a deck", rider3Deck.status === "in-trip" && rider3Deck.myTripId === tripId, {
    status: rider3Deck.status,
  });

  // A left swipe never matches.
  const left = await recordSwipe(admin, rider1, { toUser: driver2, eventId, direction: "left" });
  check("left swipe never matches", !left.matched, left);
  await admin.from("swipes").delete().eq("from_user", rider1).eq("event_id", eventId);

  // 2. Fill driver1's car.
  const deckBefore = await getPersonDeck(admin, rider1, eventId);
  check("rider1 sees driver1 while seats are open", deckBefore.people.some((p) => p.userId === driver1), {
    deck: deckBefore.people.map((p) => p.name),
  });

  for (const [rider, name] of [
    [rider2, "rider2"],
    [rider4, "rider4"],
  ] as const) {
    const r = await mutualMatch(driver1, rider, eventId, `driver1 + ${name}`);
    check(`driver1 + ${name}: matched into the same trip`, r.matched === true && r.tripId === tripId, r);
  }

  // 3. S4: full car leaves rider decks.
  const deckAfter = await getPersonDeck(admin, rider1, eventId);
  check("S4: full car (driver1, 3/3) is gone from rider1's deck", !deckAfter.people.some((p) => p.userId === driver1), {
    deck: deckAfter.people.map((p) => p.name),
  });
  check("rider1 still sees driver2, who has open seats", deckAfter.people.some((p) => p.userId === driver2));

  const driverDeck = await getPersonDeck(admin, driver1, eventId);
  check("driver1's deck reports the car is full", driverDeck.status === "car-full", { status: driverDeck.status });

  const overflow = await mutualMatch(driver1, rider1, eventId, "driver1 + rider1");
  check("one more mutual right swipe is refused as full", !overflow.matched && overflow.full === true, overflow);

  // 4. Last seat race on driver2 (2 seats): rider1 takes one, then two crowd
  // riders swipe right first and driver2 accepts both at the same moment.
  const seats2 = (
    await admin.from("attendance").select("seats").eq("event_id", eventId).eq("user_id", driver2).single()
  ).data?.seats;
  check("driver2 offers 2 seats", seats2 === 2, { seats: seats2 });
  const first2 = await mutualMatch(driver2, rider1, eventId, "driver2 + rider1");
  check("driver2 + rider1: matched (1 of 2 seats)", first2.matched === true, first2);
  const trip2 = first2.matched ? first2.tripId : "";

  const demoIds = new Set([driver1, driver2, rider1, rider2, rider3, rider4]);
  const { data: crowdRiders } = await admin
    .from("attendance")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "going")
    .eq("role", "rider");
  const [racerA, racerB, racerC, racerD] = (crowdRiders ?? []).map((r) => r.user_id).filter((id) => !demoIds.has(id));
  if (!racerD) throw new Error("Need 4 crowd riders going to the career fair. Run npm run seed.");

  for (const racer of [racerA, racerB]) {
    await recordSwipe(admin, racer, { toUser: driver2, eventId, direction: "right" });
  }
  const race = await Promise.all([
    recordSwipe(admin, driver2, { toUser: racerA, eventId, direction: "right" }),
    recordSwipe(admin, driver2, { toUser: racerB, eventId, direction: "right" }),
  ]);
  const winners = race.filter((r) => r.matched).length;
  const fullLosers = race.filter((r) => !r.matched && r.full).length;
  check("race via /api/swipe logic: exactly one wins the last seat", winners === 1 && fullLosers === 1, race);

  const { count: riders2 } = await admin.from("trip_riders").select("*", { count: "exact", head: true }).eq("trip_id", trip2);
  check("driver2's car holds exactly 2 riders", riders2 === 2, { riders: riders2 });

  // Raw concurrent inserts straight into trip_riders: only the seat trigger
  // stands between them and an overfull car. Free the last seat first.
  const loser = race[0].matched ? racerA : racerB;
  await admin.from("trip_riders").delete().eq("trip_id", trip2).eq("rider_id", loser);
  const inserts = await Promise.all(
    [racerC, racerD].map((rider) => admin.from("trip_riders").insert({ trip_id: trip2, rider_id: rider, event_id: eventId })),
  );
  const ok = inserts.filter((r) => !r.error).length;
  const rejected = inserts.filter((r) => r.error && isTripFull(r.error)).length;
  check("trigger: concurrent inserts for one seat, one accepted and one rejected as trip_full", ok === 1 && rejected === 1, {
    errors: inserts.map((r) => r.error?.message ?? null),
  });
  const { count: finalRiders2 } = await admin.from("trip_riders").select("*", { count: "exact", head: true }).eq("trip_id", trip2);
  check("driver2's car still holds exactly 2 riders", finalRiders2 === 2, { riders: finalRiders2 });

  console.log(`\nTrip ${tripId}: driver1 with rider3, rider2, rider4.`);
  console.log("Sign in as driver1@ou.edu or rider3@ou.edu (demo1234) and open Trips to see it.");
  console.log("Run `npm run seed` to reset the demo data.");
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
