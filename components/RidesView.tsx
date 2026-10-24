"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { HeaderActions } from "@/components/NavInfo";
import { ArrowRightIcon, CarIcon, ClockIcon, StarIcon } from "@/components/Icons";
import { filterRides, rideAction, sortRides, type RideFilter, type RideOffer } from "@/lib/rides";
import { shortCity } from "@/lib/trip";
import { formatClock, formatDay, formatShortDate } from "@/lib/time";
import type { ReviewItem, TripSummary } from "@/lib/queries";

const FILTERS: { key: RideFilter; label: string }[] = [
  { key: "all", label: "All rides" },
  { key: "verified", label: "Verified drivers" },
  { key: "seats", label: "Has seats" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} fill={n <= Math.round(rating) ? "currentColor" : "none"} className={n <= Math.round(rating) ? "" : "text-zinc-300"} />
      ))}
    </span>
  );
}

function RideCard({ ride }: { ride: RideOffer }) {
  const action = rideAction(ride);
  return (
    <article className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <div className="flex items-start gap-3">
        <Avatar name={ride.driverName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">
            {ride.driverName}
            {ride.isMine && <span className="font-normal text-zinc-400"> (you)</span>}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
            {ride.verified ? (
              <span className="whitespace-nowrap rounded-lg bg-green-50 px-2 py-0.5 font-semibold text-green-700">✓ Verified</span>
            ) : (
              <span className="whitespace-nowrap rounded-lg bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-500">Not verified</span>
            )}
            {ride.rating != null ? (
              <span className="flex items-center gap-1 whitespace-nowrap font-semibold text-zinc-700">
                <StarIcon fill="currentColor" className="text-amber-400" /> {ride.rating.toFixed(1)}
                <span className="font-normal text-zinc-400">({ride.reviews})</span>
              </span>
            ) : (
              <span className="text-zinc-400">New driver</span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {[ride.carModel, ride.mpg ? `${ride.mpg} mpg` : null].filter(Boolean).join(" · ") || "Car details not set"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold ${
            ride.seatsLeft > 0 ? "bg-crimson-soft text-crimson" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {ride.seatsLeft > 0 ? `${ride.seatsLeft} ${ride.seatsLeft === 1 ? "seat" : "seats"} left` : "Full"}
        </span>
      </div>

      <div className="rounded-2xl bg-zinc-50 p-4">
        <Link href={`/events/${ride.eventId}`} className="font-bold hover:underline">
          {ride.eventTitle}
        </Link>
        <p className="text-sm text-zinc-500">{formatDay(ride.eventStart)}</p>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
          <span className="truncate">{ride.pickupPoint ?? "Pickup TBD"}</span>
          <ArrowRightIcon className="shrink-0 text-zinc-400" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
          <span className="truncate">{[ride.venue, shortCity(ride.city)].filter(Boolean).join(", ")}</span>
        </p>
        {ride.departTime && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <ClockIcon /> Leaves {formatClock(ride.departTime)}
          </p>
        )}
      </div>

      {ride.latestReview && (
        <blockquote className="rounded-xl border-l-4 border-amber-300 bg-amber-50/60 px-4 py-2.5 text-sm">
          <p className="text-zinc-700">&ldquo;{ride.latestReview.comment}&rdquo;</p>
          <footer className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <Stars rating={ride.latestReview.rating} /> {ride.latestReview.reviewerName}
          </footer>
        </blockquote>
      )}

      {action.href ? (
        <Link
          href={action.href}
          className={`flex h-12 items-center justify-center rounded-2xl font-bold ${
            ride.isMine || ride.myRole === "rider" ? "bg-zinc-100 text-zinc-700" : "bg-crimson text-white shadow-md shadow-crimson/25"
          }`}
        >
          {action.label}
        </Link>
      ) : (
        <span className="flex h-12 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-zinc-400">{action.label}</span>
      )}
    </article>
  );
}

export default function RidesView({
  offers,
  reviews,
  myTrips,
}: {
  offers: RideOffer[];
  reviews: ReviewItem[];
  myTrips: TripSummary[];
}) {
  const [filter, setFilter] = useState<RideFilter>("all");
  const list = useMemo(() => sortRides(filterRides(offers, filter)), [offers, filter]);
  const verifiedCount = offers.filter((o) => o.verified).length;

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between bg-white px-5 py-4 md:hidden">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-black tracking-tight">Rides</h1>
        </div>
        <HeaderActions />
      </header>
      <h1 className="hidden pb-4 text-3xl font-black tracking-tight md:block">Rides</h1>

      <div className="flex flex-col gap-6 px-4 py-5 md:px-0">
        {myTrips.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Your rides</h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:px-0">
              {myTrips.map((t) => (
                <Link
                  key={t.id}
                  href={`/trips/${t.id}`}
                  className="flex min-w-[260px] items-center gap-3 rounded-3xl bg-crimson p-4 text-white shadow-md shadow-crimson/25"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl">
                    <CarIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{t.event.title}</span>
                    <span className="block truncate text-sm text-white/80">
                      {formatShortDate(t.event.start_time)} · {t.myRole === "driver" ? "You're driving" : `With ${t.driverName}`}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Rides offered</h2>
            <p className="text-sm text-zinc-500">
              {offers.length} drivers · {verifiedCount} verified
            </p>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  filter === f.key ? "bg-crimson text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="rounded-3xl bg-white p-10 text-center text-zinc-500">
              {offers.length === 0 ? "No one is driving to an upcoming event yet. Be the first driver!" : "No rides match this filter."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((r) => (
                <RideCard key={`${r.driverId}:${r.eventId}`} ride={r} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Recent reviews</h2>
          {reviews.length === 0 ? (
            <p className="rounded-3xl bg-white p-6 text-center text-zinc-500">No reviews yet. Riders rate their driver after drop off.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {reviews.map((r, i) => (
                <li key={i} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
                  <Avatar name={r.reviewerName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold">{r.reviewerName}</p>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      Rode with {r.driverName} · {r.eventTitle} · {formatShortDate(r.createdAt)}
                    </p>
                    {r.comment && <p className="mt-1.5 text-sm text-zinc-700">&ldquo;{r.comment}&rdquo;</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
