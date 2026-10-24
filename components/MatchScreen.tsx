"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpIcon, CheckIcon, LinkIcon, UserIcon } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import { firstName, shortName } from "@/lib/names";
import { shortCity } from "@/lib/trip";
import { formatClock } from "@/lib/time";
import type { TripDetail, TripMember } from "@/lib/queries";

export type Match = { trip: TripDetail; partnerIds: string[] };

function Person({
  member,
  label,
  role,
  detail,
}: {
  member: TripMember;
  label: string;
  role: "driver" | "rider";
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="relative">
        <Avatar name={member.name} size="xl" className="border-4 border-white md:h-32 md:w-32" />
        <span
          className={`absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#841617] text-lg text-white ${
            role === "driver" ? "bg-green-500" : "bg-amber-500"
          }`}
        >
          {role === "driver" ? <ArrowUpIcon strokeWidth={3} /> : <UserIcon strokeWidth={2.5} />}
        </span>
      </span>
      <p className="mt-1 font-bold">{label}</p>
      <p className="rounded-lg bg-white/15 px-3 py-1 text-sm font-semibold">{detail}</p>
    </div>
  );
}

// "You're Connected!": full screen on mobile, centered modal on desktop.
export default function MatchScreen({ match, meId, onClose }: { match: Match; meId: string; onClose: () => void }) {
  const { trip } = match;
  const members = [trip.driver, ...trip.riders];
  const me = members.find((m) => m.id === meId);
  const partners = members.filter((m) => match.partnerIds.includes(m.id));
  const partner = partners[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!me || !partner) return null;
  const roleOf = (m: TripMember) => (m.id === trip.driver.id ? "driver" : "rider");
  const detailOf = (m: TripMember) =>
    roleOf(m) === "driver" ? `Driver · ${trip.driver.seats ?? "?"} seats` : `Rider · ${m.pickupPoint ?? "TBD"}`;
  const venue = [trip.event.location, shortCity(trip.event.city)].filter(Boolean).join(", ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-50 flex items-stretch justify-center md:items-center md:bg-black/60 md:p-6"
    >
      <div className="relative flex w-full flex-col items-center overflow-hidden bg-[#841617] px-6 pb-8 pt-14 text-center text-white md:max-w-lg md:rounded-[32px] md:pt-10 md:shadow-2xl">
        <span className="pointer-events-none absolute -right-32 -top-20 h-96 w-96 rounded-full bg-white/5" aria-hidden />
        <span className="pointer-events-none absolute -left-24 top-1/3 h-48 w-48 rounded-full bg-white/5" aria-hidden />

        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-[#841617] shadow-xl">
          <CheckIcon strokeWidth={3} />
        </span>
        <h2 id="match-title" className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
          You&apos;re Connected!
        </h2>
        <p className="mt-3 max-w-xs text-lg text-white/80">
          You and {partners.map((p) => firstName(p.name)).join(" and ")} are riding together to {trip.event.title}
        </p>

        <div className="relative mt-10 flex items-start justify-center gap-6">
          <Person member={me} label="You" role={roleOf(me)} detail={detailOf(me)} />
          <span className="absolute left-1/2 top-12 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white text-xl text-[#841617] shadow-lg md:top-14">
            <LinkIcon />
          </span>
          <Person member={partner} label={shortName(partner.name)} role={roleOf(partner)} detail={detailOf(partner)} />
        </div>

        <div className="mt-10 w-full rounded-3xl bg-white/10 p-5 text-left">
          <div className="flex items-center justify-between gap-3 font-semibold">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-400" /> {trip.driver.pickupPoint ?? "Pickup"}
            </span>
            <ArrowRightIcon className="shrink-0 text-white/60" />
            <span className="flex items-center gap-2 text-right">
              <span className="h-3 w-3 shrink-0 rounded-full bg-amber-300" /> {venue}
            </span>
          </div>
          <div className="mt-4 flex justify-between border-t border-white/15 pt-4 text-sm text-white/75">
            <span>Est. ~{trip.roundTripMiles ?? "?"} mi round trip</span>
            <span>{trip.driver.departTime ? `Depart ${formatClock(trip.driver.departTime)}` : ""}</span>
          </div>
        </div>

        <div className="mt-auto flex w-full flex-col gap-3 pt-10">
          <Link
            href={`/trips/${trip.id}`}
            className="flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#841617] shadow-lg"
          >
            View Trip Card
          </Link>
          <button type="button" onClick={onClose} className="h-14 rounded-2xl border-2 border-white/30 text-lg font-bold text-white/85">
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}
