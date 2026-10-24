import { describe, expect, it } from "vitest";
import { costShare } from "../lib/cost";

describe("costShare", () => {
  it("splits 40 mi at 30 mpg, $2.80 gas, $0.10/mi across driver + 3 riders", () => {
    expect(costShare(40, 30, 2.8, 0.1, 3)).toBe(1.93);
  });

  it("gives the driver the full cost with no riders", () => {
    // 40/30 * 2.80 + 40 * 0.10 = 3.7333 + 4 = 7.7333
    expect(costShare(40, 30, 2.8, 0.1, 0)).toBe(7.73);
  });

  it("rounds to the cent", () => {
    // 10/25 * 3 + 10 * 0.1 = 2.2, split 3 ways = 0.7333
    expect(costShare(10, 25, 3, 0.1, 2)).toBe(0.73);
  });

  it.each([
    [0, 30, 3],
    [-5, 30, 3],
    [40, 0, 3],
    [40, -1, 3],
    [40, 30, -1],
  ])("throws on invalid input (miles=%d, mpg=%d, riders=%d)", (miles, mpg, riders) => {
    expect(() => costShare(miles, mpg, 2.8, 0.1, riders)).toThrow("invalid input");
  });
});
