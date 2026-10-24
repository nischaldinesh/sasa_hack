import { describe, expect, it } from "vitest";
import { recommendEvents } from "../lib/recommend";
import type { EventSummary } from "../lib/types";

const NOW = Date.parse("2026-10-24T12:00:00Z");

function ev(id: string, over: Partial<EventSummary>): EventSummary {
  return {
    id,
    title: id,
    organization: null,
    category: null,
    location: "Norman",
    city: "Norman",
    lat: 0,
    lng: 0,
    start_time: "2026-11-01T00:00:00Z",
    end_time: null,
    tags: [],
    requires_registration: false,
    registration_url: null,
    driver_perk: null,
    going: 0,
    interested: 0,
    newThisWeek: 0,
    friendsGoing: 0,
    openSeats: 0,
    myStatus: null,
    myRole: null,
    myRegistered: false,
    skipped: false,
    friendNames: [],
    goingMajors: [],
    ...over,
  };
}

describe("recommendEvents", () => {
  it("scores friends, my categories and popularity", () => {
    const recs = recommendEvents(
      [
        ev("friends", { friendsGoing: 1, going: 2 }), // 2.2
        ev("category", { category: "Career", going: 5 }), // 1.5
        ev("popular", { going: 30 }), // 3.0
      ],
      new Set(["Career"]),
      NOW,
    );
    expect(recs.map((r) => [r.event.id, Math.round(r.score * 10) / 10])).toEqual([
      ["popular", 3],
      ["friends", 2.2],
      ["category", 1.5],
    ]);
  });

  it("skips events I joined and past events, and breaks ties by soonest", () => {
    const recs = recommendEvents(
      [
        ev("joined", { myStatus: "going", going: 50 }),
        ev("past", { start_time: "2026-10-01T00:00:00Z", going: 50 }),
        ev("later", { going: 10, start_time: "2026-11-05T00:00:00Z" }),
        ev("sooner", { going: 10, start_time: "2026-11-02T00:00:00Z" }),
        ev("interested", { myStatus: "interested", going: 1 }),
      ],
      new Set(),
      NOW,
    );
    expect(recs.map((r) => r.event.id)).toEqual(["sooner", "later", "interested"]);
  });

  it("returns at most 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => ev(`e${i}`, { going: i }));
    expect(recommendEvents(many, new Set(), NOW)).toHaveLength(5);
  });
});
