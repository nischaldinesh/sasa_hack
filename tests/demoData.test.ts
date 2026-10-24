import { describe, expect, it } from "vitest";
import {
  ATTENDANCE,
  CROWD,
  DEMO,
  EVENTS,
  FRIEND_REQUESTS,
  FRIENDSHIPS,
  PAST_TRIPS,
  attendanceRow,
  isDemoEmail,
  isSeededEmail,
  isVerifiedDriver,
} from "../lib/demoData";

const emails = new Set([...DEMO, ...CROWD].map((u) => u.email));
const eventKeys = new Set(EVENTS.map((e) => e.key));

describe("demo data", () => {
  it("only treats the 6 demo logins as demo accounts", () => {
    expect(DEMO.map((u) => u.email)).toEqual([
      "driver1@ou.edu",
      "driver2@ou.edu",
      "rider1@ou.edu",
      "rider2@ou.edu",
      "rider3@ou.edu",
      "rider4@ou.edu",
    ]);
    expect(isDemoEmail("RIDER1@ou.edu")).toBe(true);
    expect(isDemoEmail("crowd01@ou.edu")).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
    expect(isSeededEmail("crowd18@ou.edu")).toBe(true);
    expect(isSeededEmail("someone.new@ou.edu")).toBe(false);
  });

  it("references only seeded people and events", () => {
    for (const a of ATTENDANCE) {
      expect(emails.has(a.email)).toBe(true);
      expect(eventKeys.has(a.event)).toBe(true);
    }
    for (const pair of [...FRIENDSHIPS, ...FRIEND_REQUESTS]) for (const e of pair) expect(emails.has(e)).toBe(true);
    for (const t of PAST_TRIPS)
      for (const e of [t.driver, ...t.riders.map((r) => r.email)]) expect(emails.has(e)).toBe(true);
  });

  it("has at most one attendance row per person and event", () => {
    const keys = ATTENDANCE.map((a) => `${a.email}:${a.event}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("builds ride rows that depart before the event starts", () => {
    const a = ATTENDANCE.find((x) => x.email === "driver1@ou.edu" && x.event === "career")!;
    const row = attendanceRow(a, 0, "u", "e", "2026-11-01T15:00:00.000Z", Date.parse("2026-10-24T12:00:00Z"));
    expect(row).toMatchObject({ status: "going", role: "driver", seats: 3, registered: true, split_gas: true });
    expect("depart_time" in row && Date.parse(row.depart_time)).toBe(Date.parse("2026-11-01T14:15:00.000Z"));
  });
});

describe("seeded driver verification", () => {
  it("verifies every demo driver and most, not all, crowd drivers", () => {
    for (const u of DEMO.filter((d) => d.mpg !== null)) expect(isVerifiedDriver(u)).toBe(true);
    const crowdDrivers = CROWD.filter((u) => u.mpg !== null);
    const unverified = crowdDrivers.filter((u) => !isVerifiedDriver(u));
    expect(unverified.length).toBeGreaterThan(0);
    expect(unverified.length).toBeLessThan(crowdDrivers.length / 2);
  });
});
