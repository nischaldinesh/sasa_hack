import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPersonDeck } from "./deck";
import { buildEventSummaries } from "./events";
import { haversineMiles, roundTripMiles } from "./geo";
import type { RideOffer } from "./rides";
import type {
  AttendanceRow,
  EventRow,
  EventSummary,
  FriendRow,
  FriendStatus,
  Partner,
  PersonDeck,
  PopularityRow,
  ProfileRow,
  Role,
  TripRiderRow,
  TripRow,
} from "./types";

// All loaders throw on Supabase errors; each route's error.tsx shows a short message.
// Returns unknown: rows are cast to lib/types at each call site (no generated DB types).
function must(result: { data: unknown; error: { message: string } | null }): unknown {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// PostgREST "table not found": event_skips exists only after supabase/m3.sql is run.
function isMissingTable(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

// Loads events with counts, friends going, open seats and my status.
// Pass eventId to load one event (past events included); otherwise upcoming events only.
export async function getEventSummaries(
  supabase: SupabaseClient,
  userId: string,
  eventId?: string,
): Promise<EventSummary[]> {
  let eventsQuery = supabase.from("events").select("*").order("start_time");
  eventsQuery = eventId
    ? eventsQuery.eq("id", eventId)
    : eventsQuery.gte("start_time", new Date().toISOString());

  let attendanceQuery = supabase.from("attendance").select("user_id, event_id, status, role, seats, registered");
  let popularityQuery = supabase.from("event_popularity").select("id, going, interested, new_this_week");
  let tripsQuery = supabase.from("trips").select("id, event_id, driver_id");
  let ridersQuery = supabase.from("trip_riders").select("trip_id, rider_id, event_id");
  if (eventId) {
    attendanceQuery = attendanceQuery.eq("event_id", eventId);
    popularityQuery = popularityQuery.eq("id", eventId);
    tripsQuery = tripsQuery.eq("event_id", eventId);
    ridersQuery = ridersQuery.eq("event_id", eventId);
  }

  const [events, popularity, attendance, friends, trips, tripRiders, skips] = await Promise.all([
    eventsQuery,
    popularityQuery,
    attendanceQuery,
    supabase.from("friends").select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
    tripsQuery,
    ridersQuery,
    supabase.from("event_skips").select("event_id").eq("user_id", userId),
  ]);
  if (skips.error && !isMissingTable(skips.error)) throw new Error(skips.error.message);

  const attendanceRows = must(attendance) as AttendanceRow[];
  const goingIds = [...new Set(attendanceRows.filter((a) => a.status === "going").map((a) => a.user_id))];
  const people = await getProfiles(supabase, goingIds);

  return buildEventSummaries({
    userId,
    events: must(events) as EventRow[],
    popularity: must(popularity) as PopularityRow[],
    attendance: attendanceRows,
    profiles: people,
    friends: must(friends) as FriendRow[],
    trips: must(trips) as TripRow[],
    tripRiders: must(tripRiders) as TripRiderRow[],
    skippedIds: new Set(((skips.data ?? []) as { event_id: string }[]).map((s) => s.event_id)),
  });
}

// Every ProfileRow column; person cards, rides and trip crews rely on these.
export const PROFILE_COLUMNS = "id, name, major, year, bio, orgs, car_model, mpg, interests, license_verified_at";

export async function getProfiles(supabase: SupabaseClient, ids: string[]): Promise<Map<string, ProfileRow>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows: ProfileRow[] = [];
  // Chunk ids so long lists stay well under URL length limits.
  for (let i = 0; i < unique.length; i += 150) {
    rows.push(...(must(await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", unique.slice(i, i + 150))) as ProfileRow[]));
  }
  return new Map(rows.map((p) => [p.id, p]));
}

// People to swipe on for one event (AGENTS.md 6.3).
// RLS only lets users read their own swipes, so stars toward me are read with
// `starReader`, a service role client on the server (only ids are used).
export async function getPersonDeck(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  starReader: SupabaseClient = supabase,
): Promise<PersonDeck> {
  const [attendance, swipes, trips, tripRiders, stars, ratingsRes] = await Promise.all([
    supabase.from("attendance").select("*").eq("event_id", eventId),
    supabase.from("swipes").select("to_user").eq("from_user", userId).eq("event_id", eventId),
    supabase.from("trips").select("id, driver_id").eq("event_id", eventId),
    supabase.from("trip_riders").select("trip_id, rider_id").eq("event_id", eventId),
    starReader
      .from("swipes")
      .select("from_user")
      .eq("to_user", userId)
      .eq("event_id", eventId)
      .eq("direction", "right")
      .eq("starred", true),
    supabase.from("driver_ratings").select("driver_id, rating, reviews"),
  ]);
  const rows = must(attendance) as AttendanceRow[];
  const ratings = new Map(
    (must(ratingsRes) as { driver_id: string; rating: number; reviews: number }[]).map((r) => [
      r.driver_id,
      { rating: Number(r.rating), reviews: Number(r.reviews) },
    ]),
  );
  const profiles = await getProfiles(
    supabase,
    rows.filter((a) => a.status === "going").map((a) => a.user_id),
  );

  return buildPersonDeck({
    meId: userId,
    attendance: rows,
    swipedIds: new Set((must(swipes) as { to_user: string }[]).map((s) => s.to_user)),
    starredMeIds: new Set((must(stars) as { from_user: string }[]).map((s) => s.from_user)),
    ratings,
    trips: must(trips) as Pick<TripRow, "id" | "driver_id">[],
    tripRiders: must(tripRiders) as Pick<TripRiderRow, "trip_id" | "rider_id">[],
    profiles,
  });
}

// My trip for an event and the people I matched with: a rider's driver,
// or a driver's riders. Polled by the event page to detect new matches.
export async function getPartners(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<{ tripId: string | null; partners: Partner[] }> {
  const [asRider, asDriver] = await Promise.all([
    supabase.from("trip_riders").select("trip_id, trips(driver_id)").eq("rider_id", userId).eq("event_id", eventId).maybeSingle(),
    supabase.from("trips").select("id").eq("driver_id", userId).eq("event_id", eventId).maybeSingle(),
  ]);

  let tripId: string | null = null;
  let partnerIds: string[] = [];
  const riderRow = must(asRider) as { trip_id: string; trips: { driver_id: string } | null } | null;
  const driverRow = must(asDriver) as { id: string } | null;

  if (riderRow?.trips) {
    tripId = riderRow.trip_id;
    partnerIds = [riderRow.trips.driver_id];
  } else if (driverRow) {
    const riders = must(
      await supabase.from("trip_riders").select("rider_id").eq("trip_id", driverRow.id),
    ) as { rider_id: string }[];
    if (riders.length > 0) tripId = driverRow.id;
    partnerIds = riders.map((r) => r.rider_id);
  }

  const profiles = await getProfiles(supabase, partnerIds);
  return {
    tripId,
    partners: partnerIds.map((id) => ({ id, name: profiles.get(id)?.name ?? "Sooner" })),
  };
}

// Whether my plan for an event is locked because I'm in a trip:
// a rider matched into a car, or a driver with at least one matched rider.
export async function getTripLock(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<{ locked: boolean; riderCount: number }> {
  const { tripId, partners } = await getPartners(supabase, userId, eventId);
  return { locked: tripId !== null, riderCount: partners.length };
}

type EventEmbed = Pick<EventRow, "id" | "title" | "start_time" | "location" | "lat" | "lng">;

export type TripSummary = {
  id: string;
  event: EventEmbed;
  myRole: Role;
  driverName: string;
  riderCount: number;
  seats: number | null;
  pickupPoint: string | null;
  departTime: string | null;
};

// Trips I'm in (as driver with at least one rider, or as rider), soonest first.
export async function getMyTrips(supabase: SupabaseClient, userId: string): Promise<TripSummary[]> {
  const [driving, riding] = await Promise.all([
    supabase.from("trips").select("id").eq("driver_id", userId),
    supabase.from("trip_riders").select("trip_id").eq("rider_id", userId),
  ]);
  const ids = [
    ...(must(driving) as { id: string }[]).map((t) => t.id),
    ...(must(riding) as { trip_id: string }[]).map((t) => t.trip_id),
  ];
  if (ids.length === 0) return [];

  const [tripsRes, ridersRes] = await Promise.all([
    supabase.from("trips").select("id, event_id, driver_id, events(id, title, start_time, location, lat, lng)").in("id", ids),
    supabase.from("trip_riders").select("trip_id").in("trip_id", ids),
  ]);
  const trips = must(tripsRes) as (TripRow & { events: EventEmbed | null })[];
  const riderCounts = new Map<string, number>();
  for (const r of must(ridersRes) as { trip_id: string }[]) {
    riderCounts.set(r.trip_id, (riderCounts.get(r.trip_id) ?? 0) + 1);
  }

  const driverIds = [...new Set(trips.map((t) => t.driver_id))];
  const [profiles, driverAttendance] = await Promise.all([
    getProfiles(supabase, driverIds),
    supabase
      .from("attendance")
      .select("user_id, event_id, pickup_point, depart_time, seats")
      .in("user_id", driverIds)
      .in("event_id", trips.map((t) => t.event_id)),
  ]);
  const plans = must(driverAttendance) as Pick<AttendanceRow, "user_id" | "event_id" | "pickup_point" | "depart_time" | "seats">[];

  return trips
    .filter((t) => t.events && (riderCounts.get(t.id) ?? 0) > 0)
    .map((t) => {
      const plan = plans.find((p) => p.user_id === t.driver_id && p.event_id === t.event_id);
      return {
        id: t.id,
        event: t.events!,
        myRole: (t.driver_id === userId ? "driver" : "rider") as Role,
        driverName: profiles.get(t.driver_id)?.name ?? "Sooner",
        riderCount: riderCounts.get(t.id) ?? 0,
        seats: plan?.seats ?? null,
        pickupPoint: plan?.pickup_point ?? null,
        departTime: plan?.depart_time ?? null,
      };
    })
    .sort((a, b) => Date.parse(a.event.start_time) - Date.parse(b.event.start_time));
}

export type TripMember = {
  id: string;
  name: string;
  major: string | null;
  year: string | null;
  pickupPoint: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
};

type TripEvent = EventEmbed & Pick<EventRow, "city" | "driver_perk">;

export type TripDetail = {
  id: string;
  costMode: "free" | "split";
  event: TripEvent;
  myRole: Role;
  driver: TripMember & {
    mpg: number | null;
    carModel: string | null;
    plate: string | null;
    verified: boolean;
    rating: number | null;
    reviews: number;
    seats: number | null;
    departTime: string | null;
  };
  riders: TripMember[];
  oneWayMiles: number | null;
  roundTripMiles: number | null;
  myReview: { rating: number; comment: string | null } | null; // riders only
};

// One trip card. Returns null when the trip doesn't exist or I'm not in it.
export async function getTripDetail(supabase: SupabaseClient, userId: string, tripId: string): Promise<TripDetail | null> {
  const [tripRes, ridersRes] = await Promise.all([
    supabase
      .from("trips")
      .select("id, event_id, driver_id, cost_mode, events(id, title, start_time, location, city, lat, lng, driver_perk)")
      .eq("id", tripId)
      .maybeSingle(),
    supabase.from("trip_riders").select("rider_id, matched_at").eq("trip_id", tripId).order("matched_at"),
  ]);
  const trip = must(tripRes) as (TripRow & { cost_mode: "free" | "split"; events: TripEvent | null }) | null;
  const riderIds = (must(ridersRes) as { rider_id: string }[]).map((r) => r.rider_id);
  if (!trip?.events) return null;
  if (trip.driver_id !== userId && !riderIds.includes(userId)) return null;

  const memberIds = [trip.driver_id, ...riderIds];
  const [profiles, attendanceRes, driverRes, ratingRes, reviewRes] = await Promise.all([
    getProfiles(supabase, memberIds),
    supabase
      .from("attendance")
      .select("user_id, pickup_point, pickup_lat, pickup_lng, depart_time, seats")
      .eq("event_id", trip.event_id)
      .in("user_id", memberIds),
    supabase.from("profiles").select("license_plate, license_verified_at").eq("id", trip.driver_id).maybeSingle(),
    supabase.from("driver_ratings").select("rating, reviews").eq("driver_id", trip.driver_id).maybeSingle(),
    supabase.from("reviews").select("rating, comment").eq("trip_id", tripId).eq("reviewer_id", userId).maybeSingle(),
  ]);
  const driverExtra = must(driverRes) as { license_plate: string | null; license_verified_at: string | null } | null;
  const driverRating = must(ratingRes) as { rating: number; reviews: number } | null;
  const plans = new Map(
    (must(attendanceRes) as Pick<AttendanceRow, "user_id" | "pickup_point" | "pickup_lat" | "pickup_lng" | "depart_time" | "seats">[]).map(
      (a) => [a.user_id, a],
    ),
  );
  const member = (id: string): TripMember => {
    const p = profiles.get(id);
    const plan = plans.get(id);
    return {
      id,
      name: p?.name ?? "Sooner",
      major: p?.major ?? null,
      year: p?.year ?? null,
      pickupPoint: plan?.pickup_point ?? null,
      pickupLat: plan?.pickup_lat ?? null,
      pickupLng: plan?.pickup_lng ?? null,
    };
  };

  const driverPlan = plans.get(trip.driver_id);
  const event = trip.events;
  const oneWay =
    driverPlan?.pickup_lat != null && driverPlan.pickup_lng != null
      ? haversineMiles(driverPlan.pickup_lat, driverPlan.pickup_lng, event.lat, event.lng)
      : null;
  return {
    id: trip.id,
    costMode: trip.cost_mode,
    event,
    myRole: trip.driver_id === userId ? "driver" : "rider",
    driver: {
      ...member(trip.driver_id),
      mpg: profiles.get(trip.driver_id)?.mpg ?? null,
      carModel: profiles.get(trip.driver_id)?.car_model ?? null,
      plate: driverExtra?.license_plate ?? null,
      verified: !!driverExtra?.license_verified_at,
      rating: driverRating ? Number(driverRating.rating) : null,
      reviews: driverRating ? Number(driverRating.reviews) : 0,
      seats: driverPlan?.seats ?? null,
      departTime: driverPlan?.depart_time ?? null,
    },
    riders: riderIds.map(member),
    oneWayMiles: oneWay,
    roundTripMiles:
      driverPlan?.pickup_lat != null && driverPlan.pickup_lng != null
        ? roundTripMiles(driverPlan.pickup_lat, driverPlan.pickup_lng, event.lat, event.lng)
        : null,
    myReview: must(reviewRes) as { rating: number; comment: string | null } | null,
  };
}

export type MatchItem = {
  tripId: string;
  eventTitle: string;
  partnerName: string;
  partnerRole: Role;
  matchedAt: string;
  unseen: boolean;
};

// My matches, newest first, for the bell. A match is a rider joining a trip:
// riders see their driver, drivers see each rider.
export async function getMatches(supabase: SupabaseClient, userId: string): Promise<MatchItem[]> {
  const [profileRes, asRiderRes, myTripsRes] = await Promise.all([
    supabase.from("profiles").select("matches_seen_at").eq("id", userId).maybeSingle(),
    supabase.from("trip_riders").select("trip_id, matched_at, trips(driver_id, events(title))").eq("rider_id", userId),
    supabase.from("trips").select("id, events(title)").eq("driver_id", userId),
  ]);
  const seenAt = Date.parse((must(profileRes) as { matches_seen_at: string } | null)?.matches_seen_at ?? "1970-01-01");
  const asRider = must(asRiderRes) as {
    trip_id: string;
    matched_at: string;
    trips: { driver_id: string; events: { title: string } | null } | null;
  }[];
  const myTrips = must(myTripsRes) as { id: string; events: { title: string } | null }[];

  const asDriver = myTrips.length
    ? (must(
        await supabase
          .from("trip_riders")
          .select("trip_id, rider_id, matched_at")
          .in("trip_id", myTrips.map((t) => t.id)),
      ) as { trip_id: string; rider_id: string; matched_at: string }[])
    : [];

  const names = await getProfiles(supabase, [
    ...asRider.flatMap((r) => (r.trips ? [r.trips.driver_id] : [])),
    ...asDriver.map((r) => r.rider_id),
  ]);
  const titleByTrip = new Map(myTrips.map((t) => [t.id, t.events?.title ?? "Event"]));

  const items: Omit<MatchItem, "unseen">[] = [
    ...asRider.map((r) => ({
      tripId: r.trip_id,
      eventTitle: r.trips?.events?.title ?? "Event",
      partnerName: names.get(r.trips?.driver_id ?? "")?.name ?? "Sooner",
      partnerRole: "driver" as const,
      matchedAt: r.matched_at,
    })),
    ...asDriver.map((r) => ({
      tripId: r.trip_id,
      eventTitle: titleByTrip.get(r.trip_id) ?? "Event",
      partnerName: names.get(r.rider_id)?.name ?? "Sooner",
      partnerRole: "rider" as const,
      matchedAt: r.matched_at,
    })),
  ];
  return items
    .map((m) => ({ ...m, unseen: Date.parse(m.matchedAt) > seenAt }))
    .sort((a, b) => Date.parse(b.matchedAt) - Date.parse(a.matchedAt));
}

export type FriendSummary = { id: string; name: string; major: string | null; year: string | null };

export async function getFriends(supabase: SupabaseClient, userId: string): Promise<FriendSummary[]> {
  const rows = must(
    await supabase.from("friends").select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
  ) as FriendRow[];
  const ids = rows.map((f) => (f.user_a === userId ? f.user_b : f.user_a));
  const profiles = await getProfiles(supabase, ids);
  return ids
    .map((id) => ({
      id,
      name: profiles.get(id)?.name ?? "Sooner",
      major: profiles.get(id)?.major ?? null,
      year: profiles.get(id)?.year ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Categories of events I joined as going (any date), for recommendations.
export async function getMyCategories(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const rows = must(
    await supabase.from("attendance").select("events(category)").eq("user_id", userId).eq("status", "going"),
  ) as { events: { category: string | null } | null }[];
  return new Set(rows.map((r) => r.events?.category).filter((c): c is string => !!c));
}

// Friendship state between me and each of `ids`, for crewmate buttons.
export async function getFriendStatuses(
  supabase: SupabaseClient,
  userId: string,
  ids: string[],
): Promise<Map<string, FriendStatus>> {
  const statuses = new Map<string, FriendStatus>(ids.map((id) => [id, "none"]));
  if (ids.length === 0) return statuses;
  const [friendsRes, requestsRes] = await Promise.all([
    supabase.from("friends").select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
    supabase
      .from("friend_requests")
      .select("from_user, to_user")
      .eq("status", "pending")
      .or(`from_user.eq.${userId},to_user.eq.${userId}`),
  ]);
  const friendIds = new Set((must(friendsRes) as FriendRow[]).map((f) => (f.user_a === userId ? f.user_b : f.user_a)));
  for (const r of must(requestsRes) as { from_user: string; to_user: string }[]) {
    if (r.from_user === userId && statuses.has(r.to_user)) statuses.set(r.to_user, "sent");
    if (r.to_user === userId && statuses.has(r.from_user)) statuses.set(r.from_user, "received");
  }
  for (const id of ids) if (friendIds.has(id)) statuses.set(id, "friends");
  return statuses;
}

export type FriendRequest = { fromId: string; name: string; major: string | null; year: string | null; createdAt: string };

// Pending requests sent to me, newest first.
export async function getIncomingRequests(supabase: SupabaseClient, userId: string): Promise<FriendRequest[]> {
  const rows = must(
    await supabase
      .from("friend_requests")
      .select("from_user, created_at")
      .eq("to_user", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ) as { from_user: string; created_at: string }[];
  const profiles = await getProfiles(supabase, rows.map((r) => r.from_user));
  return rows.map((r) => ({
    fromId: r.from_user,
    name: profiles.get(r.from_user)?.name ?? "Sooner",
    major: profiles.get(r.from_user)?.major ?? null,
    year: profiles.get(r.from_user)?.year ?? null,
    createdAt: r.created_at,
  }));
}

// Rides tab: every driver going to an upcoming event, with verification,
// rating, latest review and seats left.
export async function getRideOffers(supabase: SupabaseClient, userId: string): Promise<RideOffer[]> {
  const events = must(
    await supabase
      .from("events")
      .select("id, title, start_time, location, city")
      .gte("start_time", new Date().toISOString()),
  ) as Pick<EventRow, "id" | "title" | "start_time" | "location" | "city">[];
  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);

  const [driversRes, mineRes, tripsRes, ridersRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("user_id, event_id, pickup_point, depart_time, seats")
      .eq("status", "going")
      .eq("role", "driver")
      .in("event_id", eventIds),
    supabase.from("attendance").select("event_id, role").eq("user_id", userId).eq("status", "going").in("event_id", eventIds),
    supabase.from("trips").select("id, event_id, driver_id").in("event_id", eventIds),
    supabase.from("trip_riders").select("trip_id").in("event_id", eventIds),
  ]);
  const drivers = must(driversRes) as Pick<AttendanceRow, "user_id" | "event_id" | "pickup_point" | "depart_time" | "seats">[];
  const myRoles = new Map((must(mineRes) as { event_id: string; role: Role | null }[]).map((m) => [m.event_id, m.role]));
  const tripByDriverEvent = new Map((must(tripsRes) as TripRow[]).map((t) => [`${t.driver_id}:${t.event_id}`, t.id]));
  const ridersPerTrip = new Map<string, number>();
  for (const r of must(ridersRes) as { trip_id: string }[]) ridersPerTrip.set(r.trip_id, (ridersPerTrip.get(r.trip_id) ?? 0) + 1);

  const driverIds = [...new Set(drivers.map((d) => d.user_id))];
  const [profiles, ratingsRes, reviewsRes] = await Promise.all([
    getProfiles(supabase, driverIds),
    supabase.from("driver_ratings").select("driver_id, rating, reviews").in("driver_id", driverIds),
    supabase
      .from("reviews")
      .select("reviewee_id, reviewer_id, rating, comment, created_at")
      .in("reviewee_id", driverIds)
      .not("comment", "is", null)
      .order("created_at", { ascending: false }),
  ]);
  const ratings = new Map(
    (must(ratingsRes) as { driver_id: string; rating: number; reviews: number }[]).map((r) => [r.driver_id, r]),
  );
  const latest = new Map<string, { reviewer_id: string; rating: number; comment: string }>();
  for (const r of must(reviewsRes) as { reviewee_id: string; reviewer_id: string; rating: number; comment: string }[]) {
    if (!latest.has(r.reviewee_id)) latest.set(r.reviewee_id, r);
  }
  const reviewerNames = await getProfiles(supabase, [...latest.values()].map((r) => r.reviewer_id));
  const eventById = new Map(events.map((e) => [e.id, e]));

  return drivers.map((d) => {
    const e = eventById.get(d.event_id)!;
    const p = profiles.get(d.user_id);
    const tripId = tripByDriverEvent.get(`${d.user_id}:${d.event_id}`);
    const taken = tripId ? (ridersPerTrip.get(tripId) ?? 0) : 0;
    const rating = ratings.get(d.user_id);
    const review = latest.get(d.user_id);
    return {
      eventId: e.id,
      eventTitle: e.title,
      eventStart: e.start_time,
      venue: e.location,
      city: e.city,
      driverId: d.user_id,
      driverName: p?.name ?? "Sooner",
      carModel: p?.car_model ?? null,
      mpg: p?.mpg ?? null,
      verified: !!p?.license_verified_at,
      rating: rating ? Number(rating.rating) : null,
      reviews: rating ? Number(rating.reviews) : 0,
      latestReview: review
        ? { comment: review.comment, rating: review.rating, reviewerName: reviewerNames.get(review.reviewer_id)?.name ?? "A rider" }
        : null,
      pickupPoint: d.pickup_point,
      departTime: d.depart_time,
      seats: d.seats ?? 0,
      seatsLeft: Math.max(0, (d.seats ?? 0) - taken),
      isMine: d.user_id === userId,
      myRole: myRoles.get(d.event_id) ?? null,
    };
  });
}

export type ReviewItem = {
  reviewerName: string;
  driverName: string;
  eventTitle: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

// Latest reviews riders left for drivers, newest first.
export async function getRecentReviews(supabase: SupabaseClient, limit = 8): Promise<ReviewItem[]> {
  const rows = must(
    await supabase
      .from("reviews")
      .select("reviewer_id, reviewee_id, rating, comment, created_at, trips(events(title))")
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as {
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    trips: { events: { title: string } | null } | null;
  }[];
  const names = await getProfiles(supabase, rows.flatMap((r) => [r.reviewer_id, r.reviewee_id]));
  return rows.map((r) => ({
    reviewerName: names.get(r.reviewer_id)?.name ?? "A rider",
    driverName: names.get(r.reviewee_id)?.name ?? "A driver",
    eventTitle: r.trips?.events?.title ?? "a past event",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));
}
