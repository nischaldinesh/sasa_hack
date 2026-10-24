import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { notFound, redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import CancelGoingButton from "@/components/CancelGoingButton";
import CrewFriends from "@/components/CrewFriends";
import ReviewCard from "@/components/ReviewCard";
import { createClient } from "@/lib/supabase/server";
import { getFriendStatuses, getTripDetail, type TripMember } from "@/lib/queries";
import { costBreakdown, formatUsd } from "@/lib/cost";
import { shortMajor } from "@/lib/reasons";
import { shortName } from "@/lib/names";
import { planRoute } from "@/lib/route";
import { arrivalEstimate, isDroppedOff, shortCity } from "@/lib/trip";
import { formatClock, formatLongDate } from "@/lib/time";

export const metadata: Metadata = { title: "Trip card" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GAS_PRICE = Number(process.env.NEXT_PUBLIC_GAS_PRICE ?? 2.8);
const USAGE_RATE = Number(process.env.NEXT_PUBLIC_USAGE_RATE ?? 0.1);

export default function TripPage({ params }: PageProps<"/trips/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl pb-10 md:px-6 md:py-8">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading trip…</p>}>
        <TripCard params={params} />
      </Suspense>
    </main>
  );
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function CrewRow({
  member,
  isMe,
  role,
  detail,
  badge,
}: {
  member: TripMember;
  isMe: boolean;
  role: "Driver" | "Rider";
  detail: string;
  badge?: string;
}) {
  return (
    <li className="flex items-center gap-4 py-2.5">
      <Avatar name={member.name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{isMe ? `You (${shortName(member.name)})` : member.name}</p>
        <p className="truncate text-zinc-500">{detail}</p>
        {badge && <p className="text-sm font-semibold text-green-600">{badge}</p>}
      </div>
      <span
        className={`rounded-xl px-3 py-1.5 font-semibold ${role === "Driver" ? "bg-crimson-soft text-crimson" : "bg-zinc-100 text-zinc-600"}`}
      >
        {role}
      </span>
    </li>
  );
}

async function TripCard({ params }: { params: PageProps<"/trips/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const trip = await getTripDetail(supabase, user.id, id);
  if (!trip) notFound();

  const { driver, riders, event } = trip;
  const crewmates = [driver, ...riders].filter((m) => m.id !== user.id);
  const statuses = await getFriendStatuses(
    supabase,
    user.id,
    crewmates.map((m) => m.id),
  );
  // Driver's start, then pickups in the order they come along the route to the event.
  const start =
    driver.pickupLat != null && driver.pickupLng != null ? { lat: driver.pickupLat, lng: driver.pickupLng } : null;
  const pickups = riders.flatMap((r) =>
    r.pickupLat != null && r.pickupLng != null
      ? [{ name: r.pickupPoint, pickup: { lat: r.pickupLat, lng: r.pickupLng } }]
      : [],
  );
  const routeOrder = start ? planRoute(start, { lat: event.lat, lng: event.lng }, pickups).stops : pickups;
  const stops = [driver.pickupPoint, ...routeOrder.map((p) => p.name)].filter(
    (name, i, all): name is string => !!name && all.indexOf(name) === i,
  );
  const venue = [event.location, shortCity(event.city)].filter(Boolean).join(", ");
  const arrive =
    driver.departTime && trip.oneWayMiles != null ? arrivalEstimate(driver.departTime, trip.oneWayMiles) : null;
  const miles = trip.roundTripMiles;
  const arrived = isDroppedOff(arrive, event.start_time);
  const perk = event.driver_perk;
  const split =
    trip.costMode === "split" && miles && driver.mpg
      ? costBreakdown(miles, driver.mpg, GAS_PRICE, USAGE_RATE, riders.length)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-5 py-4 md:rounded-3xl md:border-0 md:shadow-sm">
        <BackButton fallback="/profile#trips" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-400">Your trip · {formatLongDate(event.start_time)}</p>
          <h1 className="truncate text-xl font-black tracking-tight">
            <Link href={`/events/${event.id}`}>{event.title}</Link>
          </h1>
        </div>
        <span className="shrink-0 rounded-2xl bg-green-50 px-4 py-2 font-bold text-green-600">Confirmed</span>
      </header>

      <div className="flex flex-col gap-4 px-4 md:px-0">
        <Card title="Your crew">
          <ul>
            <CrewRow
              member={driver}
              isMe={driver.id === user.id}
              role="Driver"
              detail={
                [driver.carModel, driver.mpg ? `${driver.mpg} mpg` : null, driver.plate].filter(Boolean).join(" · ") ||
                "Car details not set"
              }
              badge={[
                driver.verified ? "✓ Verified driver" : null,
                driver.rating != null ? `★ ${driver.rating.toFixed(1)} (${driver.reviews})` : "New driver",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            {riders.map((r) => (
              <CrewRow
                key={r.id}
                member={r}
                isMe={r.id === user.id}
                role="Rider"
                detail={[r.major ? shortMajor(r.major) : null, r.year, r.pickupPoint].filter(Boolean).join(" · ")}
              />
            ))}
          </ul>
        </Card>

        {perk && trip.myRole === "driver" && (
          <section className="flex items-center gap-4 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200">
            <span className="text-3xl" aria-hidden>
              🎁
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-amber-700">
                Driver perk from {event.title}
              </p>
              <p className="text-lg font-bold">{perk}</p>
            </div>
          </section>
        )}

        <Card title="Route">
          <ol className="relative flex flex-col gap-8 pl-8">
            <span className="absolute bottom-6 left-[7px] top-6 w-0.5 bg-zinc-200" aria-hidden />
            <li className="relative">
              <span className="absolute -left-8 top-1.5 h-4 w-4 rounded-full bg-green-500" aria-hidden />
              <p className="text-lg font-bold">{stops.join(" → ") || "Pickup TBD"}</p>
              <p className="text-zinc-500">
                Pickup stops{driver.departTime ? ` · Depart ${formatClock(driver.departTime)}` : ""}
              </p>
            </li>
            <li className="relative">
              <span className="absolute -left-8 top-1.5 h-4 w-4 rounded-full bg-red-500" aria-hidden />
              <p className="text-lg font-bold">{venue}</p>
              <p className="text-zinc-500">
                {[arrive ? `Arrive ~${formatClock(arrive)}` : null, miles != null ? `~${miles} mi total` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          </ol>
        </Card>

        <Card
          title="Gas split"
          aside={
            <span className="rounded-xl bg-green-50 px-3 py-1 text-sm font-bold text-green-600">
              {trip.costMode === "free" ? "Driver's treat" : "Split evenly"}
            </span>
          }
        >
          {trip.costMode === "free" ? (
            <div className="rounded-2xl bg-gradient-to-r from-crimson to-red-600 p-5 text-white">
              <p className="text-white/80">This ride is on {driver.id === user.id ? "you" : shortName(driver.name)}</p>
              <p className="text-4xl font-black">Free ride</p>
            </div>
          ) : split && miles && driver.mpg ? (
            <div className="flex flex-col gap-3">
              <dl className="flex flex-col gap-2 text-lg">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">
                    Fuel ({miles} mi ÷ {driver.mpg} mpg × {formatUsd(GAS_PRICE)})
                  </dt>
                  <dd className="font-semibold">{formatUsd(split.fuel)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">
                    Car usage ({miles} mi × {formatUsd(USAGE_RATE)})
                  </dt>
                  <dd className="font-semibold">{formatUsd(split.usage)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-zinc-100 pt-3">
                  <dt className="text-zinc-500">Total ÷ {split.people} people</dt>
                  <dd className="font-semibold">{formatUsd(split.total)}</dd>
                </div>
              </dl>
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-crimson to-red-600 p-5 text-white">
                <div>
                  <p className="text-white/80">Each person pays</p>
                  <p className="text-4xl font-black">{formatUsd(split.each)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-white/80">Pay via</p>
                  <p className="font-bold">Venmo / Cash</p>
                  <p className="text-white/70">App shows amount only</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">The split appears once the driver&apos;s mpg and pickup are set.</p>
          )}
        </Card>

        {trip.myRole === "rider" && (
          <ReviewCard tripId={trip.id} driverName={driver.name} arrived={arrived} existing={trip.myReview} />
        )}

        {crewmates.length > 0 && (
          <CrewFriends
            crew={crewmates.map((m) => ({ id: m.id, name: m.name, status: statuses.get(m.id) ?? "none" }))}
          />
        )}

        <CancelGoingButton
          eventId={event.id}
          eventTitle={event.title}
          role={trip.myRole}
          label={trip.myRole === "driver" ? "Cancel trip" : "Cancel my spot"}
          variant="block"
          redirectTo="/events"
        />
      </div>
    </div>
  );
}
