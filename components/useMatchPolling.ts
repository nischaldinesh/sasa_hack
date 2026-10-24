"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/components/MatchScreen";
import type { TripDetail } from "@/lib/queries";
import type { Partner } from "@/lib/types";

const POLL_MS = 3000;

type MatchStatus = { tripId: string | null; partners: Partner[]; trip: TripDetail | null };

// Shows "You're Connected!" for partners not seen yet: after my own matching
// swipe (call checkMatches) and from a 3 s poll that catches the other side.
export function useMatchPolling(eventId: string, initialPartners: Partner[]) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const seen = useRef(new Set(initialPartners.map((p) => p.id)));

  // Next keeps this page alive when hidden; don't show a stale match later.
  useLayoutEffect(() => () => setMatch(null), []);

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

  return { match, setMatch, checkMatches };
}
