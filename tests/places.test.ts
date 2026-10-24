import { describe, expect, it } from "vitest";
import { PICKUP_POINTS, isPickupKey, pickupKeyByName, searchPickups } from "../lib/places";

describe("pickup places", () => {
  it("covers campus, student housing and Norman", () => {
    const areas = new Set(Object.values(PICKUP_POINTS).map((p) => p.area));
    expect(areas).toEqual(new Set(["campus", "housing", "norman"]));
  });

  it("keeps every spot in Norman", () => {
    for (const p of Object.values(PICKUP_POINTS)) {
      expect(p.lat).toBeGreaterThan(35.15);
      expect(p.lat).toBeLessThan(35.3);
      expect(p.lng).toBeGreaterThan(-97.55);
      expect(p.lng).toBeLessThan(-97.38);
    }
  });

  it("has unique names", () => {
    const names = Object.values(PICKUP_POINTS).map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("searches by name or area, ignoring case", () => {
    expect(searchPickups("biz")).toEqual(["bizzell"]);
    expect(searchPickups("CAMPUS CORNER")).toEqual(["campuscorner"]);
    expect(searchPickups("student housing")).toContain("crimsonpark");
    expect(searchPickups("")).toHaveLength(Object.keys(PICKUP_POINTS).length);
  });

  it("maps names back to keys", () => {
    expect(pickupKeyByName("Couch Tower")).toBe("couch");
    expect(pickupKeyByName("Nowhere")).toBeNull();
    expect(isPickupKey("union")).toBe(true);
    expect(isPickupKey("toString")).toBe(false);
  });
});
