import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyTrips } from "@/lib/queries";
import { formatEventTime } from "@/lib/time";

export default function TripsPage() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-red-800 dark:text-red-500">Trips</h1>
      <Suspense fallback={<p className="p-6 text-center text-zinc-500">Loading trips…</p>}>
        <TripsList />
      </Suspense>
    </main>
  );
}

async function TripsList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const trips = await getMyTrips(supabase, user.id);
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="font-semibold">No trips yet.</p>
        <p className="text-sm text-zinc-500">Join an event and match with a driver or rider to start one.</p>
        <Link href="/events" className="h-12 rounded-full bg-red-800 px-6 font-semibold leading-[3rem] text-white">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {trips.map((trip) => (
        <li key={trip.id}>
          <Link
            href={`/trips/${trip.id}`}
            className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold leading-snug">{trip.event.title}</h2>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">
                {trip.myRole === "driver" ? "Driving" : "Riding"}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{formatEventTime(trip.event.start_time)}</p>
            <p className="text-sm">
              {trip.myRole === "driver" ? "You're driving" : `Driver: ${trip.driverName}`} · {trip.riderCount}
              {trip.seats ? `/${trip.seats}` : ""} riders
            </p>
            {trip.pickupPoint && (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                📍 {trip.pickupPoint}
                {trip.departTime ? ` · leaves ${formatEventTime(trip.departTime)}` : ""}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
