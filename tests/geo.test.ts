import { describe, expect, it } from "vitest";
import { haversineMiles, roundTripMiles } from "../lib/geo";

describe("haversineMiles", () => {
  it("is zero for the same point", () => {
    expect(haversineMiles(35.2097, -97.4446, 35.2097, -97.4446)).toBe(0);
  });

  it("measures one degree of longitude at the equator", () => {
    expect(haversineMiles(0, 0, 0, 1)).toBeCloseTo(69.09, 2);
  });

  it("is symmetric", () => {
    const a = haversineMiles(35.2097, -97.4446, 35.4634, -97.5131);
    const b = haversineMiles(35.4634, -97.5131, 35.2097, -97.4446);
    expect(a).toBeCloseTo(b, 10);
  });

  it("puts the Union about 18 miles from the OKC Convention Center", () => {
    expect(haversineMiles(35.2097, -97.4446, 35.4634, -97.5131)).toBeCloseTo(17.9, 1);
  });
});

describe("roundTripMiles", () => {
  it("doubles the distance and rounds to one decimal", () => {
    expect(roundTripMiles(35.2097, -97.4446, 35.4634, -97.5131)).toBe(35.9);
  });
});
