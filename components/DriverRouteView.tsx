"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import BackButton from "@/components/BackButton";
import MatchScreen from "@/components/MatchScreen";
import { useMatchPolling } from "@/components/useMatchPolling";
import { formatDetour } from "@/lib/route";
import { shortCity } from "@/lib/trip";
import { formatClock } from "@/lib/time";
import type { DriverRoute, RouteRider } from "@/lib/queries";
import type { Partner } from "@/lib/types";

function RiderRow({ rider }: { rider: RouteRider }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar name={rider.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{rider.name}</p>
        <p className="truncate text-sm text-zinc-500">
          {[rider.major, rider.year].filter(Boolean).join(" · ") || "Sooner"}
        </p>
        <p className="truncate text-sm">
          <span className="text-zinc-400">Pickup</span> <b>{rider.pickupPoint ?? "TBD"}</b>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="rounded-lg bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">{formatDetour(rider.detourMiles)}</span>
        {rider.status === "in-car" ? (
          <span className="text-xs font-semibold text-crimson">In your car</span>
        ) : (
          <span className="text-xs text-zinc-400">Suggested</span>
        )}
      </div>
    </li>
  );
}

// Driver view after joining: the route (start -> pickups -> event) and the
// riders it can pick up, matched automatically by detour. Drivers don't pick
// riders; a suggested rider joins the car when they accept this driver.
export default function DriverRouteView({
  meId,
  eventId,
  route,
  initialPartners,
}: {
  meId: string;
  eventId: string;
  route: DriverRoute;
  initialPartners: Partner[];
}) {
  const { match, setMatch } = useMatchPolling(eventId, initialPartners);
  const venue = [route.event.location, shortCity(route.event.city)].filter(Boolean).join(", ");
  const full = route.seatsLeft === 0;
  const fillable = Math.min(route.seatsLeft, route.suggested.length);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-5 py-4 md:rounded-3xl md:border-0 md:shadow-sm">
        <BackButton fallback={`/events/${eventId}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-400">Riders on your route to</p>
          <h1 className="truncate text-xl font-black tracking-tight">{route.event.title}</h1>
        </div>
        <span className="flex shrink-0 flex-col items-center rounded-2xl bg-crimson-soft px-4 py-2 text-crimson">
          <b className="text-xl leading-none">{route.seatsLeft}</b>
          <span className="text-xs">{route.seatsLeft === 1 ? "seat left" : "seats left"}</span>
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 md:px-0">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">Your route</h2>
          <ol className="relative flex flex-col gap-4 pl-7">
            <span className="absolute bottom-3 left-[7px] top-3 w-0.5 bg-zinc-200" aria-hidden />
            <li className="relative">
              <span className="absolute -left-7 top-1 h-4 w-4 rounded-full bg-green-500 ring-4 ring-white" aria-hidden />
              <p className="font-bold">{route.start.name ?? "Your start"}</p>
              <p className="text-sm text-zinc-500">Start{route.departTime ? ` · leave ${formatClock(route.departTime)}` : ""}</p>
            </li>
            {route.inCar.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-7 top-1 h-4 w-4 rounded-full bg-amber-400 ring-4 ring-white" aria-hidden />
                <p className="font-bold">{r.pickupPoint ?? r.name}</p>
                <p className="text-sm text-zinc-500">Pick up {r.name}</p>
              </li>
            ))}
            <li className="relative">
              <span className="absolute -left-7 top-1 h-4 w-4 rounded-full bg-red-500 ring-4 ring-white" aria-hidden />
              <p className="font-bold">{venue}</p>
              <p className="text-sm text-zinc-500">Destination</p>
            </li>
          </ol>
          <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-500">
            ~{route.route.totalMiles.toFixed(1)} mi one way
            {route.inCar.length > 0 &&
              (route.route.extraMiles < 0.1 ? <> · pickups are on your way</> : <> · pickups add {formatDetour(route.route.extraMiles)}</>)}
            <span className="block text-xs text-zinc-400">Straight-line estimate. Riders are matched within a {route.maxDetour} mi detour.</span>
          </p>
          {route.tripId && route.inCar.length > 0 && (
            <Link href={`/trips/${route.tripId}`} className="mt-3 flex h-11 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-zinc-700">
              View Trip Card
            </Link>
          )}
        </section>

        {route.inCar.length > 0 && (
          <section className="rounded-3xl bg-white px-5 py-3 shadow-sm ring-1 ring-zinc-100">
            <h2 className="pt-1 text-sm font-bold uppercase tracking-wider text-zinc-400">
              In your car · {route.inCar.length}/{route.seats}
            </h2>
            <ul className="divide-y divide-zinc-100">
              {route.inCar.map((r) => (
                <RiderRow key={r.id} rider={r} />
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-3xl bg-white px-5 py-3 shadow-sm ring-1 ring-zinc-100">
          <h2 className="pt-1 text-sm font-bold uppercase tracking-wider text-zinc-400">Riders along your route</h2>
          {full ? (
            <p className="py-4 text-zinc-500">🎉 Your car is full. No more riders will be matched.</p>
          ) : route.suggested.length === 0 ? (
            <div className="py-4">
              <p className="font-bold">No riders along your route yet.</p>
              <p className="text-sm text-zinc-500">
                Nobody needs a ride within a {route.maxDetour} mi detour of your route right now. We&apos;ll match riders
                automatically as they join, and you&apos;ll see them here.
              </p>
            </div>
          ) : (
            <>
              <p className="pt-1 text-sm text-zinc-500">
                Matched automatically, smallest detour first. These riders see you first; when one accepts, they join
                your car.
              </p>
              <ul className="divide-y divide-zinc-100">
                {route.suggested.map((r) => (
                  <RiderRow key={r.id} rider={r} />
                ))}
              </ul>
              {fillable > 0 && (
                <p className="border-t border-zinc-100 py-3 text-sm text-zinc-500">
                  If the top {fillable === 1 ? "rider joins" : `${fillable} join`}: {route.bestFit.stops.join(" → ")} → event, ~
                  {route.bestFit.totalMiles.toFixed(1)} mi ({formatDetour(route.bestFit.extraMiles)}).
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {match && <MatchScreen match={match} meId={meId} onClose={() => setMatch(null)} />}
    </div>
  );
}
