"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SwipeDeck, { type SwipeDirection } from "@/components/SwipeDeck";
import EventSwipeCard, { EventBackCard } from "@/components/EventSwipeCard";
import RegisterSheet from "@/components/RegisterSheet";
import Logo from "@/components/Logo";
import { FilterIcon, XIcon } from "@/components/Icons";
import { markInterested, markSkipped } from "@/app/events/actions";
import { sortEvents } from "@/lib/events";
import type { EventSummary } from "@/lib/types";

export default function DiscoverDeck({ events }: { events: EventSummary[] }) {
  const router = useRouter();
  const [liked, setLiked] = useState<EventSummary | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categories, setCategories] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const allCategories = useMemo(
    () => [...new Set(events.map((e) => e.category).filter((c): c is string => !!c))].sort(),
    [events],
  );
  // Deck: events I haven't swiped on or joined yet, most popular first.
  const deck = useMemo(
    () =>
      sortEvents(
        events.filter((e) => !e.myStatus && !e.skipped && (categories.size === 0 || categories.has(e.category ?? ""))),
        "going",
      ),
    [events, categories],
  );

  function handleSwipe(event: EventSummary, direction: SwipeDirection) {
    setError(null);
    if (direction === "left") {
      startTransition(async () => {
        const result = await markSkipped(event.id);
        if (result.error) setError(result.error);
      });
      return;
    }
    // Right: interested, then the registration sheet (every event; already
    // registered events go straight to How are you going).
    startTransition(async () => {
      const result = await markInterested(event.id);
      if (result.error) setError(result.error);
    });
    if (event.myRegistered) router.push(`/events/${event.id}`);
    else setLiked(event);
  }

  function toggle(category: string) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3 bg-white px-4 py-3 md:bg-transparent md:px-0 md:pt-0">
        <div className="flex items-center gap-3 md:hidden">
          <Logo />
          <span className="text-2xl font-extrabold tracking-tight">SoonerSwipe</span>
        </div>
        <h1 className="hidden text-2xl font-black tracking-tight md:block">Discover</h1>
        <button
          type="button"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
          className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 font-semibold text-zinc-700"
        >
          <FilterIcon className="text-xl" /> Filter
          {categories.size > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-crimson text-xs text-white">
              {categories.size}
            </span>
          )}
        </button>
      </header>

      {filterOpen && (
        <div className="mx-4 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 md:mx-0">
          <div className="flex items-center justify-between">
            <p className="font-bold">Categories</p>
            <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters" className="text-xl text-zinc-400">
              <XIcon />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={categories.has(c)}
                onClick={() => toggle(c)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  categories.has(c) ? "bg-crimson text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {c}
              </button>
            ))}
            {categories.size > 0 && (
              <button type="button" onClick={() => setCategories(new Set())} className="px-2 text-sm font-semibold text-crimson">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-zinc-500">Swipe right if you want to go · left to skip · tap for details</p>

      {error && (
        <p role="alert" className="mx-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="px-4 md:px-0">
        <SwipeDeck
          key={[...categories].join(",")}
          items={deck}
          getKey={(e) => e.id}
          renderCard={(e) => <EventSwipeCard event={e} />}
          renderBack={(e) => <EventBackCard event={e} />}
          hintKey="soonerswipe:hint:discover"
          demoCaptions={{
            right: "Swipe right = Going. You'll register and we'll find you a ride.",
            left: "Swipe left = Skip. It won't show up again.",
            tap: "Tap = flip the card for event details.",
          }}
          onSwipe={handleSwipe}
          paused={liked !== null}
          stamps={{
            right: { label: "Going", className: "border-green-400 text-green-400 bg-black/20" },
            left: { label: "Skip", className: "border-red-500 text-red-500 bg-black/20" },
          }}
          empty={
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-black">You&apos;re all caught up 🎉</p>
              <p className="text-sm text-zinc-500">
                {events.length === 0
                  ? "No upcoming events yet."
                  : categories.size > 0
                    ? "No more events in these categories."
                    : "Browse every event, or pick one you liked to set up your ride."}
              </p>
              <Link href="/events" className="mt-2 rounded-2xl bg-crimson px-6 py-3 font-bold text-white">
                Browse events
              </Link>
            </div>
          }
        />
      </div>

      {liked && <RegisterSheet event={liked} onClose={() => setLiked(null)} />}
    </div>
  );
}
