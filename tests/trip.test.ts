import { describe, expect, it } from "vitest";
import { arrivalEstimate, orderStops, shortCity } from "../lib/trip";
import { costBreakdown, costShare, formatUsd } from "../lib/cost";

const ADAMS = { name: "Adams Hall", lat: 35.2067, lng: -97.4434 };
const COUCH = { name: "Couch Tower", lat: 35.2017, lng: -97.4427 };
const BIZZELL = { name: "Bizzell Library", lat: 35.2081, lng: -97.4458 };
const CROSS = { name: "Cross Village", lat: 35.2003, lng: -97.4389 };

describe("orderStops", () => {
  it("starts at the driver's pickup, then nearest riders first", () => {
    expect(orderStops(ADAMS, [CROSS, COUCH, BIZZELL])).toEqual(["Adams Hall", "Bizzell Library", "Couch Tower", "Cross Village"]);
  });

  it("merges riders at the same spot as another stop", () => {
    expect(orderStops(ADAMS, [ADAMS, COUCH, COUCH])).toEqual(["Adams Hall", "Couch Tower"]);
  });
});

describe("arrivalEstimate", () => {
  it("adds one way miles at 45 mph", () => {
    // 20 mi at 45 mph = 26 min 40 s
    expect(arrivalEstimate("2026-11-01T14:15:00.000Z", 20)).toBe("2026-11-01T14:41:40.000Z");
  });
});

describe("costBreakdown", () => {
  it("matches the trip card lines and costShare", () => {
    const b = costBreakdown(40, 32, 2.8, 0.1, 2);
    expect(b).toEqual({ fuel: 3.5, usage: 4, total: 7.5, people: 3, each: 2.5 });
  });

  it("keeps S3: 40 mi, 30 mpg, $2.80, $0.10, 3 riders gives $1.93", () => {
    expect(costBreakdown(40, 30, 2.8, 0.1, 3).each).toBe(costShare(40, 30, 2.8, 0.1, 3));
    expect(costBreakdown(40, 30, 2.8, 0.1, 3).each).toBe(1.93);
  });

  it("formats dollars", () => {
    expect(formatUsd(2.5)).toBe("$2.50");
  });
});

describe("shortCity", () => {
  it("abbreviates Oklahoma City", () => {
    expect(shortCity("Oklahoma City")).toBe("OKC");
    expect(shortCity("Norman")).toBe("Norman");
    expect(shortCity(null)).toBeNull();
  });
});
