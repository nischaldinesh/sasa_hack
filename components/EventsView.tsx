"use client";

import { useMemo, useState } from "react";
import { EventListItem } from "@/components/EventCard";
import { filterEvents, sortEvents } from "@/lib/events";
import type { EventSummary, SortKey } from "@/lib/types";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "going", label: "Most going" },
  { key: "trending", label: "Trending" },
  { key: "seats", label: "Open seats" },
  { key: "soonest", label: "Soonest" },
];

export default function EventsView({ events }: { events: EventSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("going");
  const list = useMemo(() => sortEvents(filterEvents(events, query), sort), [events, query, sort]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search events, orgs, categories"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort events"
          className="h-11 rounded-xl border border-zinc-300 bg-white px-2"
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
  );
}
