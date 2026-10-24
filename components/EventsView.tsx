"use client";

import { useMemo, useState, useTransition } from "react";
import SwipeDeck, { type SwipeDirection } from "@/components/SwipeDeck";
import EventCard, { EventListItem } from "@/components/EventCard";
import { markInterested, markSkipped } from "@/app/events/actions";
import { filterEvents, sortEvents } from "@/lib/events";
import type { EventSummary, SortKey } from "@/lib/types";

type View = "swipe" | "list";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "going", label: "Most going" },
  { key: "soonest", label: "Soonest" },
];

export default function EventsView({ events }: { events: EventSummary[] }) {
  const [view, setView] = useState<View>("swipe");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("going");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Deck: events I haven't swiped on or joined yet, most popular first.
  const deck = useMemo(() => sortEvents(events.filter((e) => !e.myStatus && !e.skipped), "going"), [events]);
  const list = useMemo(() => sortEvents(filterEvents(events, query), sort), [events, query, sort]);

  function handleSwipe(event: EventSummary, direction: SwipeDirection) {
    setError(null);
    startTransition(async () => {
      const result = direction === "right" ? await markInterested(event.id) : await markSkipped(event.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        {(["swipe", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`h-10 rounded-full font-medium ${view === v ? "bg-white shadow dark:bg-zinc-800" : "text-zinc-500"}`}
          >
            {v === "swipe" ? "Swipe" : "All events"}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {view === "swipe" ? (
        <SwipeDeck
          items={deck}
          getKey={(e) => e.id}
          renderCard={(e) => <EventCard event={e} />}
          onSwipe={handleSwipe}
          empty={
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
              <p className="text-lg font-semibold">You&apos;re all caught up 🎉</p>
              <p className="text-sm text-zinc-500">
                {events.length === 0 ? "No upcoming events yet." : "Pick an event to join as a driver or rider."}
              </p>
              {events.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="h-12 rounded-full bg-red-800 px-6 font-semibold text-white"
                >
                  See all events
                </button>
              )}
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Search events, orgs, categories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort events"
              className="h-11 rounded-xl border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {list.length === 0 ? (
            <p className="p-6 text-center text-zinc-500">
              {events.length === 0 ? "No upcoming events yet." : `No events match “${query.trim()}”.`}
            </p>
          ) : (
            list.map((e) => <EventListItem key={e.id} event={e} />)
          )}
        </div>
      )}
    </div>
  );
}
