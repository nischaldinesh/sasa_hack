import { haversineMiles } from "./geo";
import { MAX_DETOUR_MILES, detourMiles, type Point } from "./route";
import type { AttendanceRow, PersonCardData, PersonDeck, ProfileRow, TripRiderRow, TripRow } from "./types";

export type DeckInput = {
  meId: string;
  attendance: AttendanceRow[]; // rows for this event
  swipedIds: Set<string>; // people I already swiped on for this event
  starredMeIds?: Set<string>; // people who starred me for this event: shown first
  trips: Pick<TripRow, "id" | "driver_id">[]; // trips for this event
  tripRiders: Pick<TripRiderRow, "trip_id" | "rider_id">[]; // riders for this event
  profiles: Map<string, ProfileRow>;
  ratings?: Map<string, { rating: number; reviews: number }>; // by driver id
  event?: Point; // destination: riders only see drivers whose route passes their pickup
  maxDetour?: number;
};

// Riders currently matched into each driver's car for one event.
export function ridersByDriver(input: Pick<DeckInput, "trips" | "tripRiders">): Map<string, number> {
  const driverByTrip = new Map(input.trips.map((t) => [t.id, t.driver_id]));
  const counts = new Map<string, number>();
  for (const r of input.tripRiders) {
    const driver = driverByTrip.get(r.trip_id);
    if (driver) counts.set(driver, (counts.get(driver) ?? 0) + 1);
  }
  return counts;
}

// Person deck rules (AGENTS.md 6.3): going, opposite role, not me, not already
// swiped, drivers with a free seat, riders not already in a car. A rider who is
// already in a trip sees no deck. With `event` set, riders only see drivers
// whose route (start -> event) passes their pickup within the max detour,
// smallest detour first. People who starred me always come first.
export function buildPersonDeck(input: DeckInput): PersonDeck {
  const { meId, attendance, swipedIds, trips, tripRiders, profiles } = input;
  const starredMe = input.starredMeIds ?? new Set<string>();
  const me = attendance.find((a) => a.user_id === meId);
  if (!me || me.status !== "going" || !me.role || me.pickup_lat == null || me.pickup_lng == null) {
    return { status: "not-going", myRole: null, myTripId: null, people: [] };
  }

  const riderCounts = ridersByDriver(input);
  const tripByDriver = new Map(trips.map((t) => [t.driver_id, t.id]));
  const riderTrip = new Map(tripRiders.map((r) => [r.rider_id, r.trip_id]));

  if (me.role === "rider") {
    const tripId = riderTrip.get(meId);
    if (tripId) return { status: "in-trip", myRole: "rider", myTripId: tripId, people: [] };
  } else {
    const tripId = tripByDriver.get(meId) ?? null;
    if ((riderCounts.get(meId) ?? 0) >= (me.seats ?? 0)) {
      return { status: "car-full", myRole: "driver", myTripId: tripId, people: [] };
    }
  }

  const wanted = me.role === "rider" ? "driver" : "rider";
  const people: PersonCardData[] = [];
  for (const a of attendance) {
    if (a.user_id === meId || a.status !== "going" || a.role !== wanted) continue;
    if (swipedIds.has(a.user_id) || a.pickup_lat == null || a.pickup_lng == null) continue;

    let seatsLeft: number | null = null;
    if (a.role === "driver") {
      seatsLeft = (a.seats ?? 0) - (riderCounts.get(a.user_id) ?? 0);
      if (seatsLeft <= 0) continue;
    } else if (riderTrip.has(a.user_id)) {
      continue;
    }

    // Route based: a driver's route runs from their start to the event. Show a
    // rider only drivers whose route passes within the max detour.
    let detour: number | null = null;
    if (a.role === "driver" && input.event) {
      detour = detourMiles({ lat: a.pickup_lat, lng: a.pickup_lng }, { lat: me.pickup_lat, lng: me.pickup_lng }, input.event);
      if (detour > (input.maxDetour ?? MAX_DETOUR_MILES) + 1e-9) continue;
    }

    const profile = profiles.get(a.user_id);
    people.push({
      userId: a.user_id,
      name: profile?.name ?? "Sooner",
      major: profile?.major ?? null,
      year: profile?.year ?? null,
      bio: profile?.bio ?? null,
      orgs: profile?.orgs ?? [],
      starredMe: starredMe.has(a.user_id),
      role: a.role,
      pickupPoint: a.pickup_point,
      distanceMiles: haversineMiles(me.pickup_lat, me.pickup_lng, a.pickup_lat, a.pickup_lng),
      detourMiles: detour,
      departTime: a.depart_time,
      seatsLeft,
      mpg: a.role === "driver" ? (profile?.mpg ?? null) : null,
      verified: a.role === "driver" && !!profile?.license_verified_at,
      rating: a.role === "driver" ? (input.ratings?.get(a.user_id)?.rating ?? null) : null,
      reviews: a.role === "driver" ? (input.ratings?.get(a.user_id)?.reviews ?? 0) : 0,
      interests: profile?.interests ?? [],
    });
  }

  // Starred first, then the smallest detour (drivers) or nearest pickup.
  people.sort(
    (x, y) =>
      Number(y.starredMe) - Number(x.starredMe) ||
      (x.detourMiles ?? x.distanceMiles) - (y.detourMiles ?? y.distanceMiles) ||
      x.name.localeCompare(y.name),
  );
  return {
    status: "open",
    myRole: me.role,
    myTripId: me.role === "driver" ? (tripByDriver.get(meId) ?? null) : null,
    people,
  };
}

export function formatMiles(miles: number): string {
  return `${miles < 0.1 ? "< 0.1" : miles.toFixed(1)} mi`;
}
