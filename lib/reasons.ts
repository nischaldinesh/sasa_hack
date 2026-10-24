// Popularity reason tags (AGENTS.md 6.6). Pure: at most 3 strings, in priority order.

export type ReasonInput = {
  friendsGoing: number;
  going: number;
  goingMajors: (string | null)[];
  newThisWeek: number;
  openSeats: number;
  tags: string[];
};

export type ReasonKind = "friends" | "major" | "trending" | "seats" | "tag";
export type Reason = { kind: ReasonKind; text: string };

const SHORT_MAJORS: Record<string, string> = {
  "Computer Science": "CS",
  "Electrical & Computer Engineering": "ECE",
  "Mechanical Engineering": "ME",
  "Industrial Engineering": "ISE",
};

export function shortMajor(major: string): string {
  return SHORT_MAJORS[major] ?? major;
}

// A major that is at least 40% of the people going, with at least 3 going.
export function popularMajor(going: number, majors: (string | null)[]): string | null {
  if (going < 3) return null;
  const counts = new Map<string, number>();
  for (const m of majors) if (m) counts.set(m, (counts.get(m) ?? 0) + 1);
  let best: [string, number] | null = null;
  for (const entry of counts) if (!best || entry[1] > best[1]) best = entry;
  return best && best[1] / going >= 0.4 ? best[0] : null;
}

export function reasonItems(input: ReasonInput): Reason[] {
  const out: Reason[] = [];
  const { friendsGoing, going, goingMajors, newThisWeek, openSeats, tags } = input;

  if (friendsGoing >= 1) {
    out.push({
      kind: "friends",
      text: friendsGoing === 1 ? "1 friend is going" : `${friendsGoing} of your friends are going`,
    });
  }
  const major = popularMajor(going, goingMajors);
  if (major) out.push({ kind: "major", text: `Popular with ${shortMajor(major)} majors` });
  if (newThisWeek >= 5) out.push({ kind: "trending", text: `Trending: up ${newThisWeek} this week` });
  if (openSeats >= 1) out.push({ kind: "seats", text: `Rides available: ${openSeats} open seats` });
  for (const tag of tags) out.push({ kind: "tag", text: tag });

  return out.slice(0, 3);
}

export function reasonTags(input: ReasonInput): string[] {
  return reasonItems(input).map((r) => r.text);
}

// Event card chips: open seats, friends going, then other reasons. At most 3.
export function eventChips(input: ReasonInput): string[] {
  const chips: string[] = [];
  if (input.openSeats >= 1) chips.push(`${input.openSeats} ${input.openSeats === 1 ? "seat" : "seats"} open`);
  if (input.friendsGoing >= 1) chips.push(`${input.friendsGoing} ${input.friendsGoing === 1 ? "friend" : "friends"} going`);
  const rest = [
    ...reasonItems({ ...input, friendsGoing: 0, openSeats: 0, newThisWeek: 0 }),
  ].map((r) => r.text);
  return [...chips, ...rest].slice(0, 3);
}
