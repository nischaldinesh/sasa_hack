export type Role = "driver" | "rider";
export type AttendanceStatus = "interested" | "going";

export type EventRow = {
  id: string;
  title: string;
  organization: string | null;
  category: string | null;
  location: string;
  lat: number;
  lng: number;
  start_time: string;
  tags: string[];
};

export type AttendanceRow = {
  user_id: string;
  event_id: string;
  status: AttendanceStatus;
  role: Role | null;
  pickup_point: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  depart_time: string | null;
  seats: number | null;
};

export type PopularityRow = {
  id: string;
  going: number;
  interested: number;
  new_this_week: number;
};

export type TripRow = { id: string; event_id: string; driver_id: string };
export type TripRiderRow = { trip_id: string; rider_id: string; event_id: string };
export type FriendRow = { user_a: string; user_b: string };

export type EventSummary = EventRow & {
  going: number;
  interested: number;
  newThisWeek: number;
  friendsGoing: number;
  openSeats: number;
  myStatus: AttendanceStatus | null;
  myRole: Role | null;
  skipped: boolean;
};

export type SortKey = "going" | "soonest";

export type ProfileRow = {
  id: string;
  name: string;
  major: string | null;
  mpg: number | null;
  interests: string[];
};

export type PersonCardData = {
  userId: string;
  name: string;
  major: string | null;
  role: Role;
  pickupPoint: string | null;
  distanceMiles: number;
  departTime: string | null;
  seatsLeft: number | null; // drivers only
  mpg: number | null; // drivers only
  interests: string[];
};

// "open": swipe on people. "in-trip": rider already in a car for this event.
// "car-full": driver with every seat matched. "not-going": no role for this event.
export type DeckStatus = "not-going" | "in-trip" | "car-full" | "open";

export type PersonDeck = {
  status: DeckStatus;
  myRole: Role | null;
  myTripId: string | null;
  people: PersonCardData[];
};

export type Partner = { id: string; name: string };
