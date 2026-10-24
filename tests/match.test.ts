import { describe, expect, it } from "vitest";
import { SwipeError, isTripFull, parseSwipeBody } from "../lib/match";

const ID = "0b8f8a0e-3c55-4f7f-9b62-6a9f1d2c3e4f";

describe("parseSwipeBody", () => {
  it("accepts a left or right swipe", () => {
    expect(parseSwipeBody({ toUser: ID, eventId: ID, direction: "left" })).toEqual({
      toUser: ID,
      eventId: ID,
      direction: "left",
      starred: false,
    });
  });

  it("accepts a star as a right swipe", () => {
    expect(parseSwipeBody({ toUser: ID, eventId: ID, direction: "right", starred: true }).starred).toBe(true);
  });

  it("rejects a starred left swipe and bad input", () => {
    expect(() => parseSwipeBody({ toUser: ID, eventId: ID, direction: "left", starred: true })).toThrow(SwipeError);
    expect(() => parseSwipeBody({ toUser: "x", eventId: ID, direction: "right" })).toThrow("Invalid toUser");
    expect(() => parseSwipeBody({ toUser: ID, eventId: ID, direction: "up" })).toThrow("Invalid direction");
    expect(() => parseSwipeBody(null)).toThrow(SwipeError);
  });
});

describe("isTripFull", () => {
  it("recognises the seat trigger's error", () => {
    expect(isTripFull({ code: "P0001", message: "trip_full" })).toBe(true);
    expect(isTripFull({ code: "23505", message: "duplicate key" })).toBe(false);
  });
});
