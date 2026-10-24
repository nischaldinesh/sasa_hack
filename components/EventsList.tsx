"use client";

import { useMemo, useState } from "react";
import EventPhotoCard from "@/components/EventPhotoCard";
import Logo from "@/components/Logo";
import { HeaderActions } from "@/components/NavInfo";
import { SearchIcon } from "@/components/Icons";
import { filterEvents, sortEvents } from "@/lib/events";
import type { EventSummary, SortKey } from "@/lib/types";

const TABS: { key: SortKey; label: string }[] = [
  { key: "going", label: "Most Going" },
  { key: "trending", label: "Trending" },
  { key: "seats", label: "Open Seats" },
  { key: "soonest", label: "Soonest" },
];

export default function EventsList({ events }: { events: EventSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("going");
  const list = useMemo(() => sortEvents(filterEvents(events, query), sort), [events, query, sort]);

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between bg-white px-5 py-4 md:hidden">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-black tracking-tight">Events</h1>
        </div>
        <HeaderActions />
      </header>
      <h1 className="hidden pb-4 text-3xl font-black tracking-tight md:block">Events</h1>

      <div className="border-y border-zinc-200 bg-white px-4 py-3 md:rounded-2xl md:border-0 md:p-0">
        <label className="flex h-12 items-center gap-3 rounded-2xl bg-zinc-100 px-4">
          <SearchIcon className="text-xl text-zinc-400" />
          <input
            type="search"
            placeholder="Search events, orgs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
          />
        </label>
      </div>

      <nav className="no-scrollbar flex gap-6 overflow-x-auto border-b border-zinc-200 bg-white px-5 md:mt-4 md:rounded-2xl md:px-4" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={sort === t.key}
            onClick={() => setSort(t.key)}
            className={`shrink-0 border-b-[3px] py-3.5 text-lg font-semibold ${
              sort === t.key ? "border-crimson text-crimson" : "border-transparent text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4 px-4 py-5 md:px-0">
        {list.length === 0 ? (
          <p className="rounded-3xl bg-white p-10 text-center text-zinc-500">
            {events.length === 0 ? "No upcoming events yet." : `No events match “${query.trim()}”.`}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => (
              <EventPhotoCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
