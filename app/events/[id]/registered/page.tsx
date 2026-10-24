import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CarIcon, CheckIcon, ClockIcon, PinIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/server";
import { formatClock, formatDay } from "@/lib/time";

export const metadata: Metadata = { title: "You're registered" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function RegisteredPage({ params }: PageProps<"/events/[id]/registered">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-24 pt-6 md:pb-8">
      <Suspense fallback={<p className="p-6 text-center text-zinc-500">Loading…</p>}>
        <Registered params={params} />
      </Suspense>
    </main>
  );
}

const QUESTIONS = [
  { text: "Driving or need a ride?", icon: <CarIcon />, tint: "bg-crimson-soft text-crimson" },
  { text: "Where should we pick you up?", icon: <PinIcon />, tint: "bg-blue-50 text-blue-500" },
  { text: "What time can you leave?", icon: <ClockIcon />, tint: "bg-green-50 text-green-600" },
];

async function Registered({ params }: { params: PageProps<"/events/[id]/registered">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: event, error }, { data: mine }] = await Promise.all([
    supabase.from("events").select("id, title, start_time").eq("id", id).maybeSingle(),
    supabase.from("attendance").select("status, registered").eq("event_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!event) notFound();
  const rideSet = mine?.status === "going";

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div>
        <div className="grid grid-cols-3 gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full ${i === 0 || (i === 1 && rideSet) ? "bg-crimson" : "bg-zinc-200"}`} />
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-400">Step {rideSet ? 2 : 1} of 3 done</p>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-3xl text-white">
            <CheckIcon strokeWidth={3} />
          </span>
        </span>
        <h1 className="mt-2 text-3xl font-black tracking-tight">You&apos;re registered!</h1>
        <p className="text-zinc-500">
          {event.title}
          <br />
          {formatDay(event.start_time)} · {formatClock(event.start_time)}
        </p>
      </div>

      <div className="rounded-3xl bg-white px-5 shadow-sm ring-1 ring-zinc-100">
        <div className="flex items-center justify-between border-b border-zinc-100 py-4">
          <span className="text-zinc-500">Event registration</span>
          <span className="rounded-xl bg-green-50 px-3 py-1 font-bold text-green-600">
            {mine?.registered ? "Registered" : "Pending"}
          </span>
        </div>
        <div className="flex items-center justify-between py-4">
          <span className="text-zinc-500">Ride</span>
          <span className={`rounded-xl px-3 py-1 font-bold ${rideSet ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-700"}`}>
            {rideSet ? "Set up" : "Not set up"}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black">Next, a few quick questions</h2>
        {QUESTIONS.map((q) => (
          <div key={q.text} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${q.tint}`}>{q.icon}</span>
            <span className="font-semibold">{q.text}</span>
          </div>
        ))}
      </section>

      <Link
        href={`/events/${event.id}`}
        className="mt-auto flex h-14 items-center justify-center rounded-2xl bg-crimson text-lg font-bold text-white shadow-lg shadow-crimson/25"
      >
        Continue
      </Link>
    </div>
  );
}
