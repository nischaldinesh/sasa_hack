import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import JoinForm from "@/components/JoinForm";
import { EventStats, StatusBadge, categoryGradient } from "@/components/EventCard";
import { createClient } from "@/lib/supabase/server";
import { getEventSummaries } from "@/lib/queries";
import { pickupKeyByName } from "@/lib/places";
import { formatEventTime, toChicagoInput } from "@/lib/time";

export default function EventDetailPage({ params }: PageProps<"/events/[id]">) {
  return (
    <main className="flex flex-col gap-4 p-4">
      <Link href="/events" className="text-sm text-zinc-500">
        ← Events
      </Link>
      <Suspense fallback={<p className="p-6 text-center text-zinc-500">Loading event…</p>}>
        <EventDetail params={params} />
      </Suspense>
    </main>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function EventDetail({ params }: { params: PageProps<"/events/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [[event], mine, profile] = await Promise.all([
    getEventSummaries(supabase, user.id, id),
    supabase
      .from("attendance")
      .select("role, pickup_point, seats, depart_time")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("mpg").eq("id", user.id).maybeSingle(),
  ]);
  if (!event) notFound();
  if (mine.error || profile.error) throw new Error((mine.error ?? profile.error)!.message);

  const defaultDepart = toChicagoInput(new Date(Date.parse(event.start_time) - 60 * 60 * 1000).toISOString());

  return (
    <>
      <section className={`rounded-3xl bg-gradient-to-br p-5 text-white ${categoryGradient(event.category)}`}>
        {event.category && (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {event.category}
          </span>
        )}
        <h1 className="mt-3 text-2xl font-bold leading-tight">{event.title}</h1>
        {event.organization && <p className="text-white/80">{event.organization}</p>}
        <p className="mt-3 text-sm">📅 {formatEventTime(event.start_time)}</p>
        <p className="text-sm">📍 {event.location}</p>
      </section>

      <section className="flex flex-col gap-2">
        <EventStats event={event} />
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{event.myStatus === "going" ? "Your ride plan" : "Join this event"}</h2>
          <StatusBadge event={event} />
        </div>
        <JoinForm
          eventId={event.id}
          initial={{
            role: event.myStatus === "going" ? event.myRole : null,
            pickup: pickupKeyByName(mine.data?.pickup_point ?? null),
            seats: mine.data?.seats ?? 3,
            mpg: profile.data?.mpg ?? 30,
            depart: mine.data?.depart_time ? toChicagoInput(mine.data.depart_time) : defaultDepart,
          }}
        />
      </section>
    </>
  );
}
