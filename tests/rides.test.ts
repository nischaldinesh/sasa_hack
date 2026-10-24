import { describe, expect, it } from "vitest";
import { filterRides, rideAction, sortRides, type RideOffer } from "../lib/rides";

const offer = (over: Partial<RideOffer>): RideOffer => ({
  eventId: "e1",
  eventTitle: "Event",
  eventStart: "2026-11-01T15:00:00Z",
  venue: "Venue",
  city: "Norman",
  driverId: "d",
  driverName: "Driver",
  carModel: null,
  mpg: 30,
  verified: true,
  rating: null,
  reviews: 0,
  latestReview: null,
  pickupPoint: "Union",
  departTime: "2026-11-01T14:00:00Z",
  seats: 3,
  seatsLeft: 3,
  isMine: false,
  myRole: null,
  ...over,
});

describe("rides", () => {
  it("filters verified drivers and open seats", () => {
    const offers = [offer({ driverId: "a" }), offer({ driverId: "b", verified: false }), offer({ driverId: "c", seatsLeft: 0 })];
    expect(filterRides(offers, "all")).toHaveLength(3);
    expect(filterRides(offers, "verified").map((o) => o.driverId)).toEqual(["a", "c"]);
    expect(filterRides(offers, "seats").map((o) => o.driverId)).toEqual(["a", "b"]);
  });

  it("sorts by departure, my car first on ties", () => {
    const sorted = sortRides([
      offer({ driverId: "late", departTime: "2026-11-02T14:00:00Z" }),
      offer({ driverId: "other", driverName: "A" }),
      offer({ driverId: "mine", driverName: "Z", isMine: true }),
      offer({ driverId: "nodepart", departTime: null, eventStart: "2026-10-30T00:00:00Z" }),
    ]);
    expect(sorted.map((o) => o.driverId)).toEqual(["nodepart", "mine", "other", "late"]);
  });

  it("picks the right button", () => {
    expect(rideAction({ isMine: true, myRole: "driver", seatsLeft: 2, eventId: "e" })).toEqual({ label: "Your car", href: "/events/e/people" });
    expect(rideAction({ isMine: false, myRole: "rider", seatsLeft: 2, eventId: "e" }).href).toBe("/events/e/people");
    expect(rideAction({ isMine: false, myRole: "driver", seatsLeft: 2, eventId: "e" }).href).toBeNull();
    expect(rideAction({ isMine: false, myRole: null, seatsLeft: 0, eventId: "e" }).label).toBe("Car full");
    expect(rideAction({ isMine: false, myRole: null, seatsLeft: 1, eventId: "e" })).toEqual({ label: "Request a seat", href: "/events/e" });
  });
});
