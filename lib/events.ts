import type {
  AttendanceRow,
  EventRow,
  EventSummary,
  FriendRow,
  PopularityRow,
  SortKey,
  TripRiderRow,
  TripRow,
} from "./types";

// Open seats per event: each going driver's seats minus riders already in their car.
export function openSeatsByEvent(
  attendance: Pick<AttendanceRow, "user_id" | "event_id" | "status" | "role" | "seats">[],
  trips: TripRow[],
  tripRiders: Pick<TripRiderRow, "trip_id">[],
): Map<string, number> {
  const ridersPerTrip = new Map<string, number>();
  for (const r of tripRiders) ridersPerTrip.set(r.trip_id, (ridersPerTrip.get(r.trip_id) ?? 0) + 1);

  const tripByDriverEvent = new Map(trips.map((t) => [`${t.driver_id}:${t.event_id}`, t.id]));
  const open = new Map<string, number>();
  for (const a of attendance) {
    if (a.status !== "going" || a.role !== "driver" || !a.seats) continue;
    const tripId = tripByDriverEvent.get(`${a.user_id}:${a.event_id}`);
    const taken = tripId ? (ridersPerTrip.get(tripId) ?? 0) : 0;
    open.set(a.event_id, (open.get(a.event_id) ?? 0) + Math.max(0, a.seats - taken));
  }
  return open;
}

export function friendIdsOf(userId: string, friends: FriendRow[]): Set<string> {
  const ids = new Set<string>();
  for (const f of friends) {
    if (f.user_a === userId) ids.add(f.user_b);
    else if (f.user_b === userId) ids.add(f.user_a);
  }
  return ids;
}

export function buildEventSummaries(input: {
  userId: string;
  events: EventRow[];
  popularity: PopularityRow[];
  attendance: Pick<AttendanceRow, "user_id" | "event_id" | "status" | "role" | "seats">[];
  friends: FriendRow[];
  trips: TripRow[];
  tripRiders: Pick<TripRiderRow, "trip_id">[];
}): EventSummary[] {
  const { userId, events, popularity, attendance, friends, trips, tripRiders } = input;
  const pop = new Map(popularity.map((p) => [p.id, p]));
  const friendIds = friendIdsOf(userId, friends);
  const openSeats = openSeatsByEvent(attendance, trips, tripRiders);

  const friendsGoing = new Map<string, number>();
  const mine = new Map<string, (typeof attendance)[number]>();
  for (const a of attendance) {
    if (a.user_id === userId) mine.set(a.event_id, a);
    if (a.status === "going" && friendIds.has(a.user_id)) {
      friendsGoing.set(a.event_id, (friendsGoing.get(a.event_id) ?? 0) + 1);
    }
  }

  return events.map((e) => {
    const p = pop.get(e.id);
    const my = mine.get(e.id);
    return {
      ...e,
      going: Number(p?.going ?? 0),
      interested: Number(p?.interested ?? 0),
      newThisWeek: Number(p?.new_this_week ?? 0),
      friendsGoing: friendsGoing.get(e.id) ?? 0,
      openSeats: openSeats.get(e.id) ?? 0,
      myStatus: my?.status ?? null,
      myRole: my?.role ?? null,
    };
  });
}

// Case insensitive match on title, organization or category.
export function filterEvents<T extends Pick<EventRow, "title" | "organization" | "category">>(
  events: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((e) =>
    [e.title, e.organization, e.category].some((field) => field?.toLowerCase().includes(q)),
  );
}

const bySoonest = (a: Pick<EventRow, "start_time">, b: Pick<EventRow, "start_time">) =>
  Date.parse(a.start_time) - Date.parse(b.start_time);

// Returns a new sorted array. "going" breaks ties by interested, then soonest.
export function sortEvents<T extends Pick<EventSummary, "going" | "interested" | "start_time">>(
  events: T[],
  key: SortKey,
): T[] {
  const sorted = [...events];
  if (key === "soonest") return sorted.sort(bySoonest);
  return sorted.sort((a, b) => b.going - a.going || b.interested - a.interested || bySoonest(a, b));
}
