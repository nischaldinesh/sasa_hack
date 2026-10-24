import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import HowGoingForm from "@/components/HowGoingForm";
import { ChevronLeftIcon, CheckCircleIcon, ClockIcon, PinIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/server";
import { getEventSummaries, getTripLock } from "@/lib/queries";
import { CAMPUS, pickupKeyByName } from "@/lib/places";
import { haversineMiles } from "@/lib/geo";
import { shortCity } from "@/lib/trip";
import { formatClock, formatShortDate, toChicagoInput } from "@/lib/time";

export const metadata: Metadata = { title: "How are you going?" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EventPage({ params }: PageProps<"/events/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl md:px-6 md:py-8">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading event…</p>}>
        <EventJoin params={params} />
      </Suspense>
    </main>
  );
}

async function EventJoin({ params }: { params: PageProps<"/events/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [[event], lock, mine, profile] = await Promise.all([
    getEventSummaries(supabase, user.id, id),
    getTripLock(supabase, user.id, id),
    supabase
      .from("attendance")
      .select("status, role, pickup_point, seats, depart_time, split_gas")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("mpg, car_model, license_verified_at").eq("id", user.id).maybeSingle(),
  ]);
  if (!event) notFound();
  if (mine.error || profile.error) throw new Error((mine.error ?? profile.error)!.message);

  const joined = mine.data?.status === "going";
  const miles = Math.round(haversineMiles(CAMPUS.lat, CAMPUS.lng, event.lat, event.lng));
  const defaultDepart = toChicagoInput(new Date(Date.parse(event.start_time) - 45 * 60 * 1000).toISOString());
  const chip = "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm leading-tight";

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-zinc-200 bg-white px-5 pb-5 pt-4 md:rounded-3xl md:border-0 md:shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/discover"
            aria-label="Back"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-2xl text-zinc-600"
          >
            <ChevronLeftIcon />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {event.category ? `${event.category} · ` : ""}
              {formatShortDate(event.start_time)}
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight">{event.title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-2">
          <span className={`${chip} bg-zinc-100 text-zinc-700`}>
            <ClockIcon className="shrink-0 text-lg text-zinc-500" />
            <span>
              {formatClock(event.start_time)}
              <br />
              start
            </span>
          </span>
          <span className={`${chip} bg-zinc-100 text-zinc-700`}>
            <PinIcon className="shrink-0 text-lg text-zinc-500" />
            <span>
              {shortCity(event.city) ?? event.location}
              {" · "}
              {miles < 1 ? "on campus" : `${miles} mi away`}
            </span>
          </span>
          <span className={`${chip} bg-crimson-soft text-crimson`}>
            <CheckCircleIcon className="shrink-0 text-lg" />
            <span>
              <b>{event.going}</b>
              <br />
              going
            </span>
          </span>
        </div>
      </header>

      <div className="px-5 pt-6 md:px-0">
        {joined && (
          <Link
            href={`/events/${event.id}/people`}
            className="mb-4 flex items-center justify-between rounded-2xl bg-green-50 p-4 font-bold text-green-800"
          >
            You&apos;re going as a {mine.data?.role}. {mine.data?.role === "driver" ? "Find riders" : "Find drivers"}
            <span aria-hidden>→</span>
          </Link>
        )}
        <HowGoingForm
          eventId={event.id}
          joined={joined}
          locked={lock.locked}
          verified={!!profile.data?.license_verified_at}
          driverPerk={event.driver_perk}
          initial={{
            role: (joined ? mine.data?.role : null) ?? (profile.data?.car_model || profile.data?.mpg ? "driver" : "rider"),
            pickup: pickupKeyByName(mine.data?.pickup_point ?? null),
            seats: mine.data?.seats ?? 3,
            mpg: profile.data?.mpg ?? 30,
            splitGas: mine.data?.split_gas ?? true,
            depart: mine.data?.depart_time ? toChicagoInput(mine.data.depart_time) : defaultDepart,
          }}
        />
      </div>
    </>
  );
}
