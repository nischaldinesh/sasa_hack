import { describe, expect, it } from "vitest";
import { eventChips, popularMajor, reasonTags } from "../lib/reasons";

const base = { friendsGoing: 0, going: 0, goingMajors: [], newThisWeek: 0, openSeats: 0, tags: [] };

describe("reasonTags", () => {
  it("returns tags in priority order, at most 3", () => {
    expect(
      reasonTags({
        friendsGoing: 2,
        going: 5,
        goingMajors: ["Computer Science", "Computer Science", "Business", null, "Biology"],
        newThisWeek: 6,
        openSeats: 4,
        tags: ["Free food"],
      }),
    ).toEqual(["2 of your friends are going", "Popular with CS majors", "Trending: up 6 this week"]);
  });

  it("uses singular wording for one friend", () => {
    expect(reasonTags({ ...base, friendsGoing: 1 })).toEqual(["1 friend is going"]);
  });

  it("falls through to rides and event tags", () => {
    expect(reasonTags({ ...base, newThisWeek: 4, openSeats: 3, tags: ["Free food", "Outdoor", "Extra"] })).toEqual([
      "Rides available: 3 open seats",
      "Free food",
      "Outdoor",
    ]);
  });

  it("returns nothing when nothing applies", () => {
    expect(reasonTags(base)).toEqual([]);
  });
});

describe("popularMajor", () => {
  it("needs at least 3 going", () => {
    expect(popularMajor(2, ["Business", "Business"])).toBeNull();
  });

  it("needs at least 40% of going", () => {
    expect(popularMajor(5, ["Business", "Business", "CS", "Bio", "Art"])).toBe("Business");
    expect(popularMajor(6, ["Business", "Business", "CS", "Bio", "Art", "Math"])).toBeNull();
  });
});

describe("eventChips", () => {
  it("shows open seats, friends going, then reasons", () => {
    expect(
      eventChips({
        friendsGoing: 3,
        going: 4,
        goingMajors: ["Computer Science", "Computer Science", "Business", "Biology"],
        newThisWeek: 20,
        openSeats: 9,
        tags: ["Free food"],
      }),
    ).toEqual(["9 seats open", "3 friends going", "Popular with CS majors"]);
  });

  it("uses singular wording", () => {
    expect(eventChips({ ...base, openSeats: 1, friendsGoing: 1, tags: ["Outdoor"] })).toEqual([
      "1 seat open",
      "1 friend going",
      "Outdoor",
    ]);
  });
});
