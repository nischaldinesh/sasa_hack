"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { HeaderActions } from "@/components/NavInfo";
import { CalendarIcon, CarIcon, SearchIcon, StarIcon, TrendingIcon, UsersIcon } from "@/components/Icons";
import { filterEvents, isTrending, sortEvents } from "@/lib/events";
import { formatShortDate } from "@/lib/time";
import { shortCity } from "@/lib/trip";
import type { EventSummary, SortKey } from "@/lib/types";

const TABS: { key: SortKey; label: string }[] = [
  { key: "going", label: "Most Going" },
  { key: "trending", label: "Trending" },
  { key: "seats", label: "Open Seats" },
  { key: "soonest", label: "Soonest" },
];

const CATEGORY_TILES: Record<string, { icon: ReactNode; tint: string }> = {
  Career: { icon: <CalendarIcon />, tint: "bg-crimson-soft text-crimson" },
  Meeting: { icon: <CalendarIcon />, tint: "bg-blue-50 text-blue-500" },
  Culture: { icon: <StarIcon />, tint: "bg-orange-50 text-orange-500" },
  Social: { icon: <UsersIcon />, tint: "bg-teal-50 text-teal-600" },
  Sports: { icon: <TrendingIcon />, tint: "bg-green-50 text-green-600" },
  Music: { icon: <StarIcon />, tint: "bg-fuchsia-50 text-fuchsia-600" },
  Conference: { icon: <CarIcon />, tint: "bg-indigo-50 text-indigo-500" },
};
const tileFor = (category: string | null) => CATEGORY_TILES[category ?? ""] ?? { icon: <CalendarIcon />, tint: "bg-zinc-100 text-zinc-500" };

const chip = "rounded-lg px-2.5 py-1 text-sm font-semibold";

function JoinButton({ event }: { event: EventSummary }) {
  return event.myStatus === "going" ? (
    <Link href={`/events/${event.id}/people`} className="shrink-0 rounded-xl bg-green-50 px-4 py-2.5 font-bold text-green-700">
      Going
    </Link>
  ) : (
    <Link href={`/events/${event.id}`} className="shrink-0 rounded-xl bg-crimson px-5 py-2.5 font-bold text-white">
      Join
    </Link>
  );
}

function Featured({ event }: { event: EventSummary }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100">
      <Link href={`/events/${event.id}`} className="flex items-start gap-4 bg-gradient-to-br from-crimson to-red-700 p-5 text-white">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {event.category && <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider">{event.category}</span>}
            {isTrending(event) && (
              <span className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold">
                <TrendingIcon /> Trending
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{event.title}</h2>
          <p className="mt-1 text-white/80">
            {formatShortDate(event.start_time)} · {event.location}
            {event.city ? `, ${shortCity(event.city)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-2xl bg-white/20 px-4 py-3">
          <b className="text-3xl leading-none">{event.going}</b>
          <span className="text-sm text-white/80">going</span>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2 p-4">
        {event.openSeats > 0 && <span className={`${chip} bg-crimson-soft text-crimson`}>{event.openSeats} seats open</span>}
        {event.newThisWeek > 0 && <span className={`${chip} bg-green-50 text-green-600`}>+{event.newThisWeek} this week</span>}
        {event.friendNames.length > 0 && (
          <span className="ml-auto flex items-center gap-2 text-zinc-500">
            <span className="flex -space-x-2">
              {event.friendNames.slice(0, 3).map((n, i) => (
                <Avatar key={`${n}-${i}`} name={n} size="xs" className="ring-2 ring-white" />
              ))}
            </span>
            {event.friendNames.length} {event.friendNames.length === 1 ? "friend" : "friends"}
          </span>
        )}
        <span className="ml-auto md:ml-4">
          <JoinButton event={event} />
        </span>
      </div>
    </article>
  );
}

function Row({ event }: { event: EventSummary }) {
  const tile = tileFor(event.category);
  const tag = event.tags[0];
  return (
    <article className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${tile.tint}`}>{tile.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Link href={`/events/${event.id}`} className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-snug">{event.title}</h3>
            <p className="truncate text-zinc-500">
              {formatShortDate(event.start_time)} · {event.location}
            </p>
          </Link>
          <JoinButton event={event} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`${chip} bg-zinc-100 text-zinc-700`}>{event.going} going</span>
          {event.openSeats > 0 && <span className={`${chip} bg-zinc-100 text-zinc-700`}>{event.openSeats} seats open</span>}
          {tag && <span className={`${chip} ${tag === "Free food" ? "bg-orange-50 text-orange-700" : "bg-zinc-100 text-zinc-700"}`}>{tag}</span>}
        </div>
      </div>
    </article>
  );
}

export default function EventsList({ events }: { events: EventSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("going");
  const list = useMemo(() => sortEvents(filterEvents(events, query), sort), [events, query, sort]);
  const [featured, ...rest] = list;

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
        {!featured ? (
          <p className="rounded-3xl bg-white p-10 text-center text-zinc-500">
            {events.length === 0 ? "No upcoming events yet." : `No events match “${query.trim()}”.`}
          </p>
        ) : (
          <>
            <Featured event={featured} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((e) => (
                <Row key={e.id} event={e} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
