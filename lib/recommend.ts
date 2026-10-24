import type { EventSummary } from "./types";

// Event recommendations (AGENTS.md 6.7). For upcoming events I haven't joined:
// score = 2 * friendsGoing + (category in categories of events I went to ? 1 : 0) + 0.1 * going.
// Top 5 by score, ties broken by soonest.

export type Recommendation = { event: EventSummary; score: number };

export function recommendEvents(
  events: EventSummary[],
  myCategories: Set<string>,
  now: number = Date.now(),
  limit = 5,
): Recommendation[] {
  return events
    .filter((e) => e.myStatus !== "going" && Date.parse(e.start_time) > now)
    .map((event) => ({
      event,
      score:
        2 * event.friendsGoing + (event.category && myCategories.has(event.category) ? 1 : 0) + 0.1 * event.going,
    }))
    .sort((a, b) => b.score - a.score || Date.parse(a.event.start_time) - Date.parse(b.event.start_time))
    .slice(0, limit);
}
