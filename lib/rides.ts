import type { Role } from "./types";

// Rides tab: one offer per driver going to an upcoming event.

export type RideOffer = {
  eventId: string;
  eventTitle: string;
  eventStart: string;
  venue: string;
  city: string | null;
  driverId: string;
  driverName: string;
  carModel: string | null;
  mpg: number | null;
  verified: boolean;
  rating: number | null;
  reviews: number;
  latestReview: { comment: string; reviewerName: string; rating: number } | null;
  pickupPoint: string | null;
  departTime: string | null;
  seats: number;
  seatsLeft: number;
  isMine: boolean;
  myRole: Role | null; // my role for this event, if going
};

export type RideFilter = "all" | "verified" | "seats";

export function filterRides(offers: RideOffer[], filter: RideFilter): RideOffer[] {
  if (filter === "verified") return offers.filter((o) => o.verified);
  if (filter === "seats") return offers.filter((o) => o.seatsLeft > 0);
  return offers;
}

// Soonest departure first; my own car first among equals.
export function sortRides(offers: RideOffer[]): RideOffer[] {
  const time = (o: RideOffer) => Date.parse(o.departTime ?? o.eventStart);
  return [...offers].sort((a, b) => time(a) - time(b) || Number(b.isMine) - Number(a.isMine) || a.driverName.localeCompare(b.driverName));
}

// Where the ride button should take me.
export function rideAction(o: Pick<RideOffer, "isMine" | "myRole" | "seatsLeft" | "eventId">): { label: string; href: string | null } {
  if (o.isMine) return { label: "Your car", href: `/events/${o.eventId}/people` };
  if (o.myRole === "rider") return { label: "Find this driver", href: `/events/${o.eventId}/people` };
  if (o.myRole === "driver") return { label: "You're driving", href: null };
  if (o.seatsLeft <= 0) return { label: "Car full", href: null };
  return { label: "Request a seat", href: `/events/${o.eventId}` };
}
