"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SwipeDeck, { type SwipeDirection } from "@/components/SwipeDeck";
import PersonCard from "@/components/PersonCard";
import MatchScreen, { type Match } from "@/components/MatchScreen";
import type { Partner, PersonCardData, PersonDeck } from "@/lib/types";

const POLL_MS = 3000;

type SwipeResponse = { matched?: boolean; tripId?: string; full?: boolean; error?: string };
type MatchStatus = { tripId: string | null; partners: Partner[] };

export default function PeopleSection({
  eventId,
  eventTitle,
  deck,
  initialPartners,
}: {
  eventId: string;
  eventTitle: string;
  deck: PersonDeck;
  initialPartners: Partner[];
}) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const seen = useRef(new Set(initialPartners.map((p) => p.id)));
  const going = deck.status !== "not-going";

  // Poll for matches completed by the other person's swipe.
  useEffect(() => {
    if (!going) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/match?eventId=${eventId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as MatchStatus;
        const fresh = data.partners.filter((p) => !seen.current.has(p.id));
        if (!active || !data.tripId || fresh.length === 0) return;
        fresh.forEach((p) => seen.current.add(p.id));
        setMatch({ names: fresh.map((p) => p.name), tripId: data.tripId });
        router.refresh();
      } catch {
        // Offline or a transient error: try again on the next tick.
      }
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [eventId, going, router]);

  async function swipe(person: PersonCardData, direction: SwipeDirection) {
    setNotice(null);
    try {
      const res = await fetch("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUser: person.userId, eventId, direction }),
      });
      const data = (await res.json().catch(() => ({}))) as SwipeResponse;
      if (!res.ok) {
        setNotice(data.error ?? "Couldn't save that swipe. Try again.");
        return;
      }
      if (data.matched && data.tripId) {
        seen.current.add(person.userId);
        setMatch({ names: [person.name], tripId: data.tripId });
        router.refresh();
      } else if (data.full) {
        setNotice(`${person.name}'s car just filled up.`);
        router.refresh();
      }
    } catch {
      setNotice("Couldn't reach the server. Check your connection.");
    }
  }

  return (
    <section className="flex flex-col gap-3">
      {match && <MatchScreen match={match} eventTitle={eventTitle} onClose={() => setMatch(null)} />}
      {notice && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {notice}
        </p>
      )}
      <Body deck={deck} onSwipe={swipe} />
    </section>
  );
}

function TripLink({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/trips/${tripId}`}
      className="flex items-center justify-between rounded-2xl bg-green-50 p-4 font-semibold text-green-900 dark:bg-green-950 dark:text-green-100"
    >
      <span>{children}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

function Body({ deck, onSwipe }: { deck: PersonDeck; onSwipe: (p: PersonCardData, d: SwipeDirection) => void }) {
  if (deck.status === "not-going") return null;

  if (deck.status === "in-trip" && deck.myTripId) {
    return <TripLink tripId={deck.myTripId}>🚗 You have a ride! View your trip</TripLink>;
  }
  if (deck.status === "car-full") {
    return deck.myTripId ? (
      <TripLink tripId={deck.myTripId}>🎉 Your car is full. View your trip</TripLink>
    ) : (
      <p className="text-sm text-zinc-500">Your car is full.</p>
    );
  }

  const isRider = deck.myRole === "rider";
  return (
    <>
      {deck.myTripId && <TripLink tripId={deck.myTripId}>🚗 View your trip</TripLink>}
      <h2 className="text-lg font-semibold">{isRider ? "Drivers going your way" : "Riders near your pickup"}</h2>
      <SwipeDeck
        items={deck.people}
        getKey={(p) => p.userId}
        renderCard={(p) => <PersonCard person={p} />}
        onSwipe={onSwipe}
        stamps={{
          right: { label: "Connect", className: "border-green-500 text-green-500 bg-white/70" },
          left: { label: "Skip", className: "border-red-500 text-red-500 bg-white/70" },
        }}
        empty={
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="font-semibold">
              {isRider ? "No one going yet. Be the first driver!" : "No riders waiting right now."}
            </p>
            <p className="text-sm text-zinc-500">
              {isRider
                ? "Drivers with open seats show up here, nearest pickup first."
                : "Riders show up here, nearest pickup first. We'll tell you when someone matches."}
            </p>
          </div>
        }
      />
    </>
  );
}
