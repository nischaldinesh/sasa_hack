import { describe, expect, it } from "vitest";
import { haversineMiles } from "../lib/geo";
import {
  detourMiles,
  detourMinutes,
  formatDetour,
  isOnRoute,
  planRoute,
  progressAlong,
  rankRouteRiders,
} from "../lib/route";

// Driver starts at the Union and drives north to the Cox Convention Center in OKC.
const UNION = { lat: 35.2097, lng: -97.4446 };
const OKC = { lat: 35.466, lng: -97.5135 };
const BIZZELL = { lat: 35.2081, lng: -97.4458 }; // next to the start
const COUCH = { lat: 35.2017, lng: -97.4427 }; // a bit south, behind the start
const MIDWAY = { lat: 35.34, lng: -97.48 }; // along I-35 toward OKC
const SOONER_MALL = { lat: 35.218, lng: -97.49 }; // west, off the route
const TULSA = { lat: 36.1497, lng: -95.9931 }; // nowhere near
const CRIMSON_PARK = { lat: 35.1938, lng: -97.4398 }; // south, away from OKC: ~2.3 mi detour

describe("detourMiles", () => {
  it("is zero for a pickup on the straight line", () => {
    const onLine = { lat: (UNION.lat + OKC.lat) / 2, lng: (UNION.lng + OKC.lng) / 2 };
    expect(detourMiles(UNION, onLine, OKC)).toBeLessThan(0.01);
  });

  it("grows with how far off the route the pickup is", () => {
    expect(detourMiles(UNION, BIZZELL, OKC)).toBeLessThan(0.3);
    expect(detourMiles(UNION, COUCH, OKC)).toBeGreaterThan(1);
    expect(detourMiles(UNION, COUCH, OKC)).toBeLessThan(1.5);
    expect(detourMiles(UNION, TULSA, OKC)).toBeGreaterThan(100);
  });
});

describe("rankRouteRiders", () => {
  const riders = [
    { id: "couch", pickup: COUCH },
    { id: "mall", pickup: SOONER_MALL },
    { id: "bizzell", pickup: BIZZELL },
    { id: "midway", pickup: MIDWAY },
    { id: "tulsa", pickup: TULSA },
    { id: "crimson", pickup: CRIMSON_PARK },
  ];

  it("keeps riders within the max detour, smallest detour first", () => {
    const ranked = rankRouteRiders(UNION, OKC, riders, 2);
    // midway 0.0, bizzell 0.2, couch 1.1, mall 1.7; crimson 2.3 and tulsa are too far.
    expect(ranked.map((r) => r.id)).toEqual(["midway", "bizzell", "couch", "mall"]);
    expect(ranked.every((r) => r.detourMiles <= 2)).toBe(true);
    expect(ranked[0].detourMinutes).toBeGreaterThanOrEqual(0);
  });

  it("uses the configured max detour", () => {
    expect(rankRouteRiders(UNION, OKC, riders, 0.5).map((r) => r.id)).toEqual(["midway", "bizzell"]);
    expect(rankRouteRiders(UNION, OKC, riders, 3).map((r) => r.id)).toContain("crimson");
  });

  it("isOnRoute matches the ranking", () => {
    expect(isOnRoute(UNION, BIZZELL, OKC, 2)).toBe(true);
    expect(isOnRoute(UNION, TULSA, OKC, 2)).toBe(false);
  });
});

describe("planRoute", () => {
  it("orders pickups along the route and measures the extra distance", () => {
    const plan = planRoute(UNION, OKC, [
      { id: "midway", pickup: MIDWAY },
      { id: "bizzell", pickup: BIZZELL },
    ]);
    expect(plan.stops.map((s) => s.id)).toEqual(["bizzell", "midway"]);
    expect(plan.totalMiles).toBeGreaterThan(plan.directMiles);
    expect(plan.extraMiles).toBeCloseTo(plan.totalMiles - plan.directMiles, 10);
    expect(plan.extraMinutes).toBe(detourMinutes(plan.extraMiles));
  });

  it("picks the shortest order for pickups behind the start", () => {
    // All three are south of the Union while OKC is north, so "progress along
    // the route" ties; the planner must still find the shortest order.
    const ADAMS = { lat: 35.2067, lng: -97.4434 };
    const HEADINGTON = { lat: 35.2028, lng: -97.4438 };
    const stops = [
      { id: "adams", pickup: ADAMS },
      { id: "headington", pickup: HEADINGTON },
      { id: "couch", pickup: COUCH },
    ];
    const length = (order: typeof stops) => {
      let total = 0;
      let at = UNION;
      for (const s of order) {
        total += haversineMiles(at.lat, at.lng, s.pickup.lat, s.pickup.lng);
        at = s.pickup;
      }
      return total + haversineMiles(at.lat, at.lng, OKC.lat, OKC.lng);
    };
    const all = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ].map((idx) => idx.map((i) => stops[i]));
    const shortest = Math.min(...all.map(length));

    const plan = planRoute(UNION, OKC, stops);
    expect(plan.totalMiles).toBeCloseTo(shortest, 9);
    expect(planRoute(UNION, OKC, [...stops].reverse()).totalMiles).toBeCloseTo(shortest, 9);
  });

  it("is the direct trip with no pickups", () => {
    const plan = planRoute(UNION, OKC, []);
    expect(plan.extraMiles).toBe(0);
    expect(plan.totalMiles).toBeCloseTo(plan.directMiles, 10);
  });
});

describe("helpers", () => {
  it("measures progress from start (0) to end (1)", () => {
    expect(progressAlong(UNION, UNION, OKC)).toBe(0);
    expect(progressAlong(UNION, OKC, OKC)).toBe(1);
    expect(progressAlong(UNION, MIDWAY, OKC)).toBeGreaterThan(0.4);
    expect(progressAlong(UNION, COUCH, OKC)).toBe(0); // behind the start
  });

  it("formats detours", () => {
    expect(formatDetour(0.05)).toBe("on your way");
    expect(formatDetour(1.5)).toBe("+1.5 mi · ~3 min");
  });
});
