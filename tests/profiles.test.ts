import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILE_COLUMNS, getProfiles } from "../lib/queries";
import { CROWD, DEMO, plateFor } from "../lib/demoData";

describe("getProfiles", () => {
  it("selects every column person cards, rides and trip crews use", () => {
    for (const col of ["name", "major", "year", "bio", "orgs", "car_model", "mpg", "license_verified_at"]) {
      expect(PROFILE_COLUMNS.split(", ")).toContain(col);
    }
  });

  it("queries in chunks with unique ids and maps rows by id", async () => {
    const calls: { cols: string; ids: string[] }[] = [];
    const fake = {
      from: () => ({
        select: (cols: string) => ({
          in: async (_: string, ids: string[]) => {
            calls.push({ cols, ids });
            return { data: ids.map((id) => ({ id, name: `n${id}` })), error: null };
          },
        }),
      }),
    } as unknown as SupabaseClient;
    const ids = Array.from({ length: 320 }, (_, i) => String(i));
    const map = await getProfiles(fake, [...ids, "0", "1"]);
    expect(calls.map((c) => c.ids.length)).toEqual([150, 150, 20]);
    expect(calls[0].cols).toBe(PROFILE_COLUMNS);
    expect(map.size).toBe(320);
    expect(map.get("5")?.name).toBe("n5");
  });
});

describe("plateFor", () => {
  it("makes a 3 letter, 3 digit plate for every seeded driver", () => {
    for (const u of [...DEMO, ...CROWD]) expect(plateFor(u.email)).toMatch(/^[A-Z]{3}-\d{3}$/);
  });
});
