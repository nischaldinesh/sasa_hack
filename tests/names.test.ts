import { describe, expect, it } from "vitest";
import { avatarColor, firstName, initials, shortName } from "../lib/names";

describe("names", () => {
  it("builds initials", () => {
    expect(initials("Priya Krishnamurthy")).toBe("PK");
    expect(initials("Cher")).toBe("C");
    expect(initials("Mary Jo Ann Smith")).toBe("MJ");
  });

  it("shortens names", () => {
    expect(shortName("Priya Krishnamurthy")).toBe("Priya K.");
    expect(shortName("Cher")).toBe("Cher");
    expect(firstName("Jai Shah")).toBe("Jai");
  });

  it("keeps a stable avatar color per name", () => {
    expect(avatarColor("Jai Shah")).toBe(avatarColor("Jai Shah"));
  });
});
