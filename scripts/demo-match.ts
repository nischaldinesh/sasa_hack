// Simulates the route based match flow against the real database, using the
// same code as POST /api/swipe (lib/match.ts) and the event page
// (lib/queries.ts). Drivers never pick riders: a rider whose pickup is on the
// driver's route (start -> event, within the max detour) joins the car as soon
// as they swipe right on that driver.
//
// 1. rider3 swipes right on driver1 for the OU Career Fair -> instant match.
// 2. driver1's route view lists suggested riders within the max detour,
//    smallest detour first, and never suggests an off-route rider.
// 3. An off-route rider's right swipe does not match.
// 4. rider2 and rider4 fill driver1's car; the full car leaves rider decks (S4)
//    and one more rider is refused with { full: true }.
// 5. Last seat race (M4): two riders race for driver2's last seat, through
//    recordSwipe and with raw concurrent inserts; only one may win.
//
// Changes demo data. Run `npm run seed` afterwards to reset.
// Usage: npm run demo:match
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { isTripFull, recordSwipe } from "../lib/match";
import { getDriverRoute, getPersonDeck } from "../lib/queries";
import { MAX_DETOUR_MILES, detourMiles } from "../lib/route";

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

type Plan = { user_id: string; role: string | null; pickup_point: string | null; pickup_lat: number; pickup_lng: number };

async function main() {
  const { data: event, error } = await admin.from("events").select("id, lat, lng").eq("title", EVENT_TITLE).single();
  if (error) throw new Error(`event: ${error.message}. Run npm run seed first.`);
  const eventId: string = event.id;
  const end = { lat: event.lat, lng: event.lng };

  const [driver1, driver2, rider1, rider2, rider3, rider4] = await Promise.all(
    ["driver1", "driver2", "rider1", "rider2", "rider3", "rider4"].map((u) => userId(`${u}@ou.edu`)),
  );
  const demoIds = new Set([driver1, driver2, rider1, rider2, rider3, rider4]);

  // Start clean for this event so the script is repeatable.
  await admin.from("trips").delete().eq("event_id", eventId);
  await admin.from("swipes").delete().eq("event_id", eventId);

  const { data: plans } = await admin
    .from("attendance")
    .select("user_id, role, pickup_point, pickup_lat, pickup_lng, seats")
    .eq("event_id", eventId)
    .eq("status", "going");
  const plan = (id: string) => (plans ?? []).find((p) => p.user_id === id) as Plan & { seats: number | null };
  const startOf = (id: string) => ({ lat: plan(id).pickup_lat, lng: plan(id).pickup_lng });
  const detourFor = (driver: string, rider: string) => detourMiles(startOf(driver), startOf(rider), end);
  check("driver1 offers 3 seats", plan(driver1).seats === 3, { seats: plan(driver1).seats });

  // 1. Instant match: rider3 (Couch Tower) is on driver1's route (Union -> OKC).
  check("rider3's pickup is on driver1's route", detourFor(driver1, rider3) <= MAX_DETOUR_MILES, {
    detour: +detourFor(driver1, rider3).toFixed(2),
    max: MAX_DETOUR_MILES,
  });
  const match = await recordSwipe(admin, rider3, { toUser: driver1, eventId, direction: "right" });
  check("rider3's right swipe matches right away (driver auto-accepts)", match.matched === true, match);
  const tripId = match.matched ? match.tripId : "";
  const rider3Deck = await getPersonDeck(admin, rider3, eventId);
  check("rider3 now sees their trip instead of a deck", rider3Deck.status === "in-trip" && rider3Deck.myTripId === tripId);

  // 2. driver1's route view: suggestions on the route, smallest detour first.
  const route = await getDriverRoute(admin, driver1, eventId, admin);
  check("driver1's route lists rider3 in the car", route?.inCar.some((r) => r.id === rider3) ?? false);
  const detours = route?.suggested.map((r) => r.detourMiles) ?? [];
  check("suggested riders are within the max detour", detours.every((d) => d <= MAX_DETOUR_MILES + 1e-9), {
    count: detours.length,
  });
  check(
    "suggested riders are ranked by smallest detour",
    detours.every((d, i) => i === 0 || detours[i - 1] <= d),
  );
  const offRoute = (plans ?? []).find(
    (p) => p.role === "rider" && !demoIds.has(p.user_id) && detourFor(driver1, p.user_id) > MAX_DETOUR_MILES,
  );
  check("an off-route rider exists in the seed", !!offRoute, offRoute && { pickup: offRoute.pickup_point });
  if (offRoute) {
    check(
      "driver1 is never suggested an off-route rider",
      !(route?.suggested.some((r) => r.id === offRoute.user_id) ?? true),
      { pickup: offRoute.pickup_point, detour: +detourFor(driver1, offRoute.user_id).toFixed(2) },
    );
    // 3. The off-route rider doesn't see driver1, and a swipe anyway doesn't match.
    const offDeck = await getPersonDeck(admin, offRoute.user_id, eventId);
    check("off-route rider's deck leaves driver1 out", !offDeck.people.some((p) => p.userId === driver1));
    const off = await recordSwipe(admin, offRoute.user_id, { toUser: driver1, eventId, direction: "right" });
    check("off-route right swipe does not match", !off.matched && off.offRoute === true, off);
  }

  // A left swipe never matches.
  const left = await recordSwipe(admin, rider1, { toUser: driver2, eventId, direction: "left" });
  check("left swipe never matches", !left.matched, left);
  await admin.from("swipes").delete().eq("from_user", rider1).eq("event_id", eventId);

  // 4. Fill driver1's car with rider2 and rider4 (both on the route).
  const deckBefore = await getPersonDeck(admin, rider1, eventId);
  check("rider1 sees driver1 while seats are open", deckBefore.people.some((p) => p.userId === driver1));
  for (const [rider, name] of [
    [rider2, "rider2"],
    [rider4, "rider4"],
  ] as const) {
    const r = await recordSwipe(admin, rider, { toUser: driver1, eventId, direction: "right" });
    check(`${name} joins driver1's car (detour ${detourFor(driver1, rider).toFixed(1)} mi)`, r.matched === true && r.tripId === tripId, r);
  }
  const deckAfter = await getPersonDeck(admin, rider1, eventId);
  check("S4: full car (driver1, 3/3) is gone from rider1's deck", !deckAfter.people.some((p) => p.userId === driver1));
  const driverDeck = await getPersonDeck(admin, driver1, eventId);
  check("driver1's deck reports the car is full", driverDeck.status === "car-full", { status: driverDeck.status });
  const fullRoute = await getDriverRoute(admin, driver1, eventId, admin);
  check("driver1's route shows 3 riders in pickup order", fullRoute?.inCar.length === 3, {
    stops: fullRoute?.route.stops,
    extraMiles: fullRoute && +fullRoute.route.extraMiles.toFixed(2),
  });
  const overflow = await recordSwipe(admin, rider1, { toUser: driver1, eventId, direction: "right" });
  check("one more rider is refused as full", !overflow.matched && overflow.full === true, overflow);

  // 5. Last seat race on driver2 (2 seats): rider1 takes one, then two riders
  // on driver2's route swipe right at the same moment.
  check("driver2 offers 2 seats", plan(driver2).seats === 2, { seats: plan(driver2).seats });
  const first2 = await recordSwipe(admin, rider1, { toUser: driver2, eventId, direction: "right" });
  check("rider1 joins driver2's car (1 of 2 seats)", first2.matched === true, first2);
  const trip2 = first2.matched ? first2.tripId : "";

  const { data: inCars } = await admin.from("trip_riders").select("rider_id").eq("event_id", eventId);
  const taken = new Set((inCars ?? []).map((r) => r.rider_id));
  const racers = (plans ?? [])
    .filter((p) => p.role === "rider" && !demoIds.has(p.user_id) && !taken.has(p.user_id))
    .filter((p) => detourFor(driver2, p.user_id) <= MAX_DETOUR_MILES)
    .map((p) => p.user_id);
  if (racers.length < 4) throw new Error("Need 4 free riders on driver2's route. Run npm run seed.");
  const [racerA, racerB, racerC, racerD] = racers;

  const race = await Promise.all(
    [racerA, racerB].map((racer) => recordSwipe(admin, racer, { toUser: driver2, eventId, direction: "right" })),
  );
  const winners = race.filter((r) => r.matched).length;
  const fullLosers = race.filter((r) => !r.matched && r.full).length;
  check("race via /api/swipe logic: exactly one wins the last seat", winners === 1 && fullLosers === 1, race);
  const { count: riders2 } = await admin.from("trip_riders").select("*", { count: "exact", head: true }).eq("trip_id", trip2);
  check("driver2's car holds exactly 2 riders", riders2 === 2, { riders: riders2 });

  // Raw concurrent inserts straight into trip_riders: only the seat trigger
  // stands between them and an overfull car. Free the last seat first.
  const winner = race[0].matched ? racerA : racerB;
  await admin.from("trip_riders").delete().eq("trip_id", trip2).eq("rider_id", winner);
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
  console.log("Sign in as driver1@ou.edu (demo1234) and open the career fair to see the route.");
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
