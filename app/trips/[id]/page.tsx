import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTripDetail, type TripMember } from "@/lib/queries";
import { formatEventTime } from "@/lib/time";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TripPage({ params }: PageProps<"/trips/[id]">) {
  return (
    <main className="flex flex-col gap-4 p-4">
      <Link href="/trips" className="text-sm text-zinc-500">
        ← Trips
      </Link>
      <Suspense fallback={<p className="p-6 text-center text-zinc-500">Loading trip…</p>}>
        <TripCard params={params} />
      </Suspense>
    </main>
  );
}

function Member({ member, label, isMe }: { member: TripMember; label: string; isMe: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="font-semibold">
          {member.name}
          {isMe && <span className="font-normal text-zinc-500"> (you)</span>}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {[label, member.major, member.pickupPoint && `pickup: ${member.pickupPoint}`].filter(Boolean).join(" · ")}
        </p>
      </div>
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
  const seatsText = driver.seats ? `${riders.length}/${driver.seats} seats filled` : `${riders.length} riders`;

  return (
    <article className="flex flex-col gap-4">
      <section className="rounded-3xl bg-gradient-to-br from-red-900 to-red-600 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Your trip</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">
          <Link href={`/events/${event.id}`}>{event.title}</Link>
        </h1>
        <p className="mt-2 text-sm">📅 {formatEventTime(event.start_time)}</p>
        <p className="text-sm">📍 {event.location}</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Pickup point</p>
          <p className="font-semibold">{driver.pickupPoint ?? "TBD"}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Departure</p>
          <p className="font-semibold">{driver.departTime ? formatEventTime(driver.departTime) : "TBD"}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Car</p>
          <p className="font-semibold">{seatsText}</p>
          {driver.mpg && <p className="text-xs text-zinc-500">{driver.mpg} mpg</p>}
        </div>
        <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Round trip</p>
          <p className="font-semibold">{trip.roundTripMiles != null ? `${trip.roundTripMiles} mi` : "TBD"}</p>
          <p className="text-xs text-zinc-500">approx.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Who&apos;s riding</h2>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <Member member={driver} label="🚗 Driver" isMe={driver.id === user.id} />
          {riders.map((r) => (
            <Member key={r.id} member={r} label="🙋 Rider" isMe={r.id === user.id} />
          ))}
        </ul>
      </section>
    </article>
  );
}
