import { describe, expect, it } from "vitest";
import { chicagoToUtc, chicagoToday, formatEventTime, parseChicagoInput, toChicagoInput } from "../lib/time";

describe("chicagoToUtc", () => {
  it("uses CDT (UTC-5) before daylight saving time ends", () => {
    expect(chicagoToUtc(2026, 10, 30, 10).toISOString()).toBe("2026-10-30T15:00:00.000Z");
  });

  it("uses CST (UTC-6) after daylight saving time ends on Nov 1, 2026", () => {
    expect(chicagoToUtc(2026, 11, 1, 10).toISOString()).toBe("2026-11-01T16:00:00.000Z");
    expect(chicagoToUtc(2026, 11, 10, 20).toISOString()).toBe("2026-11-11T02:00:00.000Z");
  });

  it("rolls overflowing days into the next month", () => {
    expect(chicagoToUtc(2026, 10, 24 + 17, 20).toISOString()).toBe("2026-11-11T02:00:00.000Z");
  });

  it("handles the spring forward change", () => {
    expect(chicagoToUtc(2026, 3, 7, 12).toISOString()).toBe("2026-03-07T18:00:00.000Z");
    expect(chicagoToUtc(2026, 3, 9, 12).toISOString()).toBe("2026-03-09T17:00:00.000Z");
  });
});

describe("chicagoToday", () => {
  it("returns the Chicago date, not the UTC date", () => {
    // 03:00 UTC on Oct 25 is 22:00 on Oct 24 in Chicago.
    expect(chicagoToday(new Date("2026-10-25T03:00:00Z"))).toEqual({ year: 2026, month: 10, day: 24 });
  });
});

describe("datetime-local round trip", () => {
  it("parses input as Chicago time", () => {
    expect(parseChicagoInput("2026-11-02T09:30")?.toISOString()).toBe("2026-11-02T15:30:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(parseChicagoInput("")).toBeNull();
    expect(parseChicagoInput("2026-13-02T09:30")).toBeNull();
    expect(parseChicagoInput("tomorrow")).toBeNull();
  });

  it("formats an instant back to the same input value", () => {
    expect(toChicagoInput("2026-11-02T15:30:00.000Z")).toBe("2026-11-02T09:30");
    expect(toChicagoInput("2026-10-30T15:00:00.000Z")).toBe("2026-10-30T10:00");
  });
});

describe("formatEventTime", () => {
  it("shows Chicago wall clock time", () => {
    expect(formatEventTime("2026-11-02T16:00:00.000Z")).toContain("10:00");
    expect(formatEventTime("2026-11-02T16:00:00.000Z")).toContain("Nov 2");
  });
});
