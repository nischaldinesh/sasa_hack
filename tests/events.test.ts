import { describe, expect, it } from "vitest";
import { buildEventSummaries, filterEvents, openSeatsByEvent, sortEvents } from "../lib/events";
import type { EventRow } from "../lib/types";

const event = (id: string, start: string, extra: Partial<EventRow> = {}): EventRow => ({
  id,
  title: `Event ${id}`,
  organization: null,
  category: null,
  location: "Norman",
  lat: 35.2,
  lng: -97.4,
  start_time: start,
  tags: [],
  ...extra,
});

describe("openSeatsByEvent", () => {
  it("subtracts matched riders from each driver's seats", () => {
    const open = openSeatsByEvent(
      [
        { user_id: "d1", event_id: "e1", status: "going", role: "driver", seats: 3 },
        { user_id: "d2", event_id: "e1", status: "going", role: "driver", seats: 2 },
        { user_id: "r1", event_id: "e1", status: "going", role: "rider", seats: null },
        { user_id: "d3", event_id: "e2", status: "interested", role: null, seats: null },
      ],
      [{ id: "t1", event_id: "e1", driver_id: "d1" }],
      [{ trip_id: "t1" }, { trip_id: "t1" }],
    );
    expect(open.get("e1")).toBe(1 + 2);
    expect(open.get("e2")).toBeUndefined();
  });

  it("never counts a full car as negative", () => {
    const open = openSeatsByEvent(
      [{ user_id: "d1", event_id: "e1", status: "going", role: "driver", seats: 1 }],
      [{ id: "t1", event_id: "e1", driver_id: "d1" }],
      [{ trip_id: "t1" }, { trip_id: "t1" }],
    );
    expect(open.get("e1")).toBe(0);
  });
});

describe("buildEventSummaries", () => {
  it("adds counts, friends going and my status", () => {
    const [s] = buildEventSummaries({
      userId: "me",
      events: [event("e1", "2026-11-01T16:00:00Z")],
      popularity: [{ id: "e1", going: 3, interested: 2, new_this_week: 5 }],
      attendance: [
        { user_id: "me", event_id: "e1", status: "interested", role: null, seats: null },
        { user_id: "f1", event_id: "e1", status: "going", role: "rider", seats: null },
        { user_id: "f2", event_id: "e1", status: "interested", role: null, seats: null },
        { user_id: "x", event_id: "e1", status: "going", role: "rider", seats: null },
      ],
      friends: [
        { user_a: "f1", user_b: "me" },
        { user_a: "f2", user_b: "me" },
      ],
      trips: [],
      tripRiders: [],
    });
    expect(s).toMatchObject({ going: 3, interested: 2, newThisWeek: 5, friendsGoing: 1, myStatus: "interested", myRole: null });
  });
});

describe("filterEvents", () => {
  const events = [
    event("a", "2026-11-01T00:00:00Z", { title: "OKC Career Fair", organization: "Career Services", category: "Career" }),
    event("b", "2026-11-02T00:00:00Z", { title: "SASE Social", organization: "SASE at OU", category: "Social" }),
  ];

  it("matches title, organization or category, ignoring case", () => {
    expect(filterEvents(events, "career").map((e) => e.id)).toEqual(["a"]);
    expect(filterEvents(events, "sase AT ou").map((e) => e.id)).toEqual(["b"]);
    expect(filterEvents(events, "SOCIAL").map((e) => e.id)).toEqual(["b"]);
  });

  it("returns everything for a blank query", () => {
    expect(filterEvents(events, "  ")).toHaveLength(2);
  });
});

describe("sortEvents", () => {
  const rows = [
    { id: "a", going: 1, interested: 0, start_time: "2026-11-03T00:00:00Z" },
    { id: "b", going: 6, interested: 0, start_time: "2026-11-05T00:00:00Z" },
    { id: "c", going: 1, interested: 4, start_time: "2026-11-04T00:00:00Z" },
    { id: "d", going: 1, interested: 4, start_time: "2026-11-01T00:00:00Z" },
  ];

  it("sorts by most going, then interested, then soonest", () => {
    expect(sortEvents(rows, "going").map((e) => e.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("sorts by soonest", () => {
    expect(sortEvents(rows, "soonest").map((e) => e.id)).toEqual(["d", "a", "c", "b"]);
  });

  it("does not mutate the input", () => {
    sortEvents(rows, "going");
    expect(rows[0].id).toBe("a");
  });
});
