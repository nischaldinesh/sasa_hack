import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PHOTO_CREDITS, photoCredit } from "../lib/photoCredits";

describe("photo credits", () => {
  it("credits every photo in public/events, and every credit has a file", () => {
    for (const path of Object.keys(PHOTO_CREDITS)) expect(existsSync(`public${path}`)).toBe(true);
  });

  it("links author, license and source for openly licensed photos", () => {
    for (const credit of Object.values(PHOTO_CREDITS)) {
      if (credit.license.startsWith("CC")) {
        expect(credit.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
        expect(credit.source).toMatch(/^https:\/\//);
      }
    }
  });

  it("returns null for events without a known photo", () => {
    expect(photoCredit(null)).toBeNull();
    expect(photoCredit("/events/unknown.jpg")).toBeNull();
  });
});
