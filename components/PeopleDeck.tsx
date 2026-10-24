"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SwipeDeck, { type SwipeDirection } from "@/components/SwipeDeck";
import PersonCard, { PersonBackCard } from "@/components/PersonCard";
import MatchScreen, { type Match } from "@/components/MatchScreen";
import BackButton from "@/components/BackButton";
import type { TripDetail } from "@/lib/queries";
import type { Partner, PersonCardData, PersonDeck as Deck } from "@/lib/types";

const POLL_MS = 3000;

type SwipeResponse = { matched?: boolean; tripId?: string; full?: boolean; error?: string };
type MatchStatus = { tripId: string | null; partners: Partner[]; trip: TripDetail | null };

export default function PeopleDeck({
  meId,
  eventId,
  eventTitle,
  deck,
  initialPartners,
}: {
  meId: string;
  eventId: string;
  eventTitle: string;
  deck: Deck;
  initialPartners: Partner[];
}) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Clear the match screen and notices when this page is hidden (Next keeps
  // it alive), so coming back later doesn't show a stale "You're Connected!".
  useLayoutEffect(
    () => () => {
      setMatch(null);
      setNotice(null);
    },
    [],
  );
  const seen = useRef(new Set(initialPartners.map((p) => p.id)));
  const lookingFor = deck.myRole === "driver" ? "riders" : "drivers";
  const count = deck.people.length;

  // Shows "You're Connected!" for partners I haven't seen yet. Used after my
  // own matching swipe and by the poll that catches the other person's swipe.
  const checkMatches = useCallback(async () => {
    const res = await fetch(`/api/match?eventId=${eventId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as MatchStatus;
    const fresh = data.partners.filter((p) => !seen.current.has(p.id));
    if (!data.trip || fresh.length === 0) return;
    fresh.forEach((p) => seen.current.add(p.id));
    setMatch({ trip: data.trip, partnerIds: fresh.map((p) => p.id) });
    router.refresh();
  }, [eventId, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      checkMatches().catch(() => {
        // Offline or a transient error: try again on the next tick.
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [checkMatches]);

  async function swipe(person: PersonCardData, direction: SwipeDirection) {
    setNotice(null);
    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUser: person.userId,
          eventId,
          direction: direction === "left" ? "left" : "right",
          starred: direction === "up",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as SwipeResponse;
      if (!res.ok) {
        setNotice(data.error ?? "Couldn't save that swipe. Try again.");
        return;
      }
      if (data.matched) await checkMatches();
      else if (data.full) {
        setNotice(`${person.name.split(" ")[0]}'s car just filled up.`);
        router.refresh();
      } else if (direction === "up") {
        setNotice(`⭐ Starred ${person.name.split(" ")[0]}. You'll be first in their deck.`);
      }
    } catch {
      setNotice("Couldn't reach the server. Check your connection.");
    }
  }

  let body: ReactNode;
  if (deck.status === "in-trip" || deck.status === "car-full") {
    body = (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-sm">
        <p className="text-4xl">{deck.status === "car-full" ? "🎉" : "🚗"}</p>
        <p className="text-xl font-black">{deck.status === "car-full" ? "Your car is full" : "You have a ride!"}</p>
        <p className="text-sm text-zinc-500">See your crew, the route and the gas split on your trip card.</p>
        {deck.myTripId && (
          <Link href={`/trips/${deck.myTripId}`} className="mt-2 rounded-2xl bg-crimson px-6 py-3 font-bold text-white">
            View Trip Card
          </Link>
        )}
      </div>
    );
  } else {
    body = (
      <SwipeDeck
        items={deck.people}
        getKey={(p) => p.userId}
        renderCard={(p) => <PersonCard person={p} />}
        renderBack={(p) => <PersonBackCard person={p} />}
        hintKey="soonerswipe:hint:people"
        demoCaptions={{
          right: "Swipe right = Connect. If they swipe right too, you ride together.",
          left: "Swipe left = Skip. They won't be told.",
          tap: "Tap = flip the card for their full profile.",
        }}
        onSwipe={swipe}
        allowStar
        showProgress
        paused={match !== null}
        stamps={{
          right: { label: "Connect", className: "border-green-500 text-green-500 bg-white/80" },
          left: { label: "Skip", className: "border-red-500 text-red-500 bg-white/80" },
          up: { label: "Star", className: "border-amber-400 text-amber-500 bg-white/80" },
        }}
        empty={
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black">
              {deck.myRole === "rider" ? "No one going yet. Be the first driver!" : "No riders waiting right now."}
            </p>
            <p className="text-sm text-zinc-500">
              {deck.myRole === "rider"
                ? "Drivers with open seats show up here, nearest pickup first."
                : "Riders show up here, nearest pickup first. We'll tell you when someone matches."}
            </p>
            {deck.myTripId && (
              <Link href={`/trips/${deck.myTripId}`} className="mt-3 rounded-2xl bg-crimson px-6 py-3 font-bold text-white">
                View Trip Card
              </Link>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-5 py-4 md:rounded-3xl md:border-0 md:shadow-sm">
        <BackButton fallback={`/events/${eventId}`} label="Back" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-400">{lookingFor === "riders" ? "Riders" : "Drivers"} going to</p>
          <h1 className="truncate text-xl font-black tracking-tight">{eventTitle}</h1>
        </div>
        <span className="flex shrink-0 flex-col items-center rounded-2xl bg-crimson-soft px-4 py-2 text-crimson">
          <b className="text-xl leading-none">{count}</b>
          <span className="text-xs">{count === 1 ? lookingFor.slice(0, -1) : lookingFor}</span>
        </span>
      </header>

      {notice && (
        <p role="status" className="mx-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 md:mx-0">
          {notice}
        </p>
      )}
      {deck.myTripId && deck.status === "open" && (
        <Link
          href={`/trips/${deck.myTripId}`}
          className="mx-4 flex items-center justify-between rounded-2xl bg-green-50 p-4 font-bold text-green-800 md:mx-0"
        >
          🚗 You have riders. View Trip Card <span aria-hidden>→</span>
        </Link>
      )}

      <div className="px-4 md:px-0">{body}</div>

      {match && <MatchScreen match={match} meId={meId} onClose={() => setMatch(null)} />}
    </div>
  );
}
