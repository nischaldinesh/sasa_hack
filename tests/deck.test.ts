import { describe, expect, it } from "vitest";
import { buildPersonDeck, formatMiles } from "../lib/deck";
import type { AttendanceRow, ProfileRow } from "../lib/types";

const UNION = { lat: 35.2097, lng: -97.4446 };
const BIZZELL = { lat: 35.2081, lng: -97.4458 };
const HEADINGTON = { lat: 35.2028, lng: -97.4438 };

function going(user_id: string, role: "driver" | "rider", at: { lat: number; lng: number }, seats: number | null = null): AttendanceRow {
  return {
    user_id,
    event_id: "e1",
    status: "going",
    role,
    pickup_point: user_id,
    pickup_lat: at.lat,
    pickup_lng: at.lng,
    depart_time: null,
    seats: role === "driver" ? (seats ?? 3) : null,
    registered: false,
    split_gas: true,
  };
}

const profiles = new Map<string, ProfileRow>(
  ["me", "d1", "d2", "d3", "r1", "r2", "r3"].map((id) => [id, { id, name: id.toUpperCase(), major: null, year: null, bio: null, orgs: [], car_model: null, mpg: 30, interests: [] }]),
);

const base = { swipedIds: new Set<string>(), trips: [], tripRiders: [], profiles };

describe("buildPersonDeck", () => {
  it("shows a rider the drivers going, nearest pickup first", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      attendance: [
        going("me", "rider", UNION),
        going("d1", "driver", HEADINGTON),
        going("d2", "driver", BIZZELL),
        going("r1", "rider", UNION),
        { ...going("d3", "driver", UNION), status: "interested", role: null },
      ],
    });
    expect(deck.status).toBe("open");
    expect(deck.people.map((p) => p.userId)).toEqual(["d2", "d1"]);
    expect(deck.people[0].distanceMiles).toBeGreaterThan(0);
    expect(deck.people[0].seatsLeft).toBe(3);
  });

  it("shows a driver only riders, skipping riders already in a car", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      attendance: [going("me", "driver", UNION, 3), going("d1", "driver", UNION), going("r1", "rider", BIZZELL), going("r2", "rider", UNION)],
      trips: [{ id: "t1", driver_id: "d1" }],
      tripRiders: [{ trip_id: "t1", rider_id: "r2" }],
    });
    expect(deck.people.map((p) => p.userId)).toEqual(["r1"]);
    expect(deck.people[0].mpg).toBeNull();
  });

  it("puts people who starred me first, with a flag", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      starredMeIds: new Set(["d1"]),
      attendance: [going("me", "rider", UNION), going("d1", "driver", HEADINGTON), going("d2", "driver", BIZZELL)],
    });
    expect(deck.people.map((p) => [p.userId, p.starredMe])).toEqual([
      ["d1", true],
      ["d2", false],
    ]);
  });

  it("hides people I already swiped on", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      swipedIds: new Set(["d1"]),
      attendance: [going("me", "rider", UNION), going("d1", "driver", UNION), going("d2", "driver", BIZZELL)],
    });
    expect(deck.people.map((p) => p.userId)).toEqual(["d2"]);
  });

  it("drops a full car from rider decks (S4)", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      attendance: [going("me", "rider", UNION), going("d1", "driver", UNION, 2), going("d2", "driver", BIZZELL, 2)],
      trips: [
        { id: "t1", driver_id: "d1" },
        { id: "t2", driver_id: "d2" },
      ],
      tripRiders: [
        { trip_id: "t1", rider_id: "r1" },
        { trip_id: "t1", rider_id: "r2" },
        { trip_id: "t2", rider_id: "r3" },
      ],
    });
    expect(deck.people.map((p) => p.userId)).toEqual(["d2"]);
    expect(deck.people[0].seatsLeft).toBe(1);
  });

  it("shows a rider in a trip their trip instead of a deck", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      attendance: [going("me", "rider", UNION), going("d1", "driver", UNION), going("d2", "driver", BIZZELL)],
      trips: [{ id: "t1", driver_id: "d1" }],
      tripRiders: [{ trip_id: "t1", rider_id: "me" }],
    });
    expect(deck).toEqual({ status: "in-trip", myRole: "rider", myTripId: "t1", people: [] });
  });

  it("tells a driver with every seat matched that the car is full", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      attendance: [going("me", "driver", UNION, 1), going("r1", "rider", UNION), going("r2", "rider", UNION)],
      trips: [{ id: "t1", driver_id: "me" }],
      tripRiders: [{ trip_id: "t1", rider_id: "r1" }],
    });
    expect(deck.status).toBe("car-full");
    expect(deck.myTripId).toBe("t1");
  });

  it("returns not-going when I only marked interest", () => {
    const deck = buildPersonDeck({
      ...base,
      meId: "me",
      attendance: [{ ...going("me", "rider", UNION), status: "interested", role: null }, going("d1", "driver", UNION)],
    });
    expect(deck.status).toBe("not-going");
  });
});

describe("formatMiles", () => {
  it("formats to one decimal", () => {
    expect(formatMiles(1.234)).toBe("1.2 mi");
    expect(formatMiles(0)).toBe("< 0.1 mi");
  });
});
