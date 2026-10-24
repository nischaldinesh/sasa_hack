"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertIcon, CheckIcon } from "@/components/Icons";
import { markRegistered } from "@/app/events/actions";
import { formatClock, formatDay } from "@/lib/time";
import type { EventSummary } from "@/lib/types";

const STEPS = ["Register for the event", "Tell us how you're getting there", "Meet people riding your way"];

// "You liked this event": bottom sheet on mobile, centered modal on desktop.
// Shown for every right swipe. Events with an external registration link open
// it; other events register (RSVP) inside GatherGo.
export default function RegisterSheet({ event, onClose }: { event: EventSummary; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function register(openSite: boolean) {
    // Open the tab synchronously inside the click so popup blockers allow it.
    if (openSite && event.registration_url) window.open(event.registration_url, "_blank", "noopener,noreferrer");
    setBusy(true);
    setError(null);
    const result = await markRegistered(event.id);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/events/${event.id}/registered`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="liked-title" className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:bg-black/60 md:p-6">
      <div className="flex flex-1 flex-col bg-gradient-to-b from-[#2b2245] to-[#5a2a2a] md:w-full md:max-w-lg md:flex-none md:overflow-hidden md:rounded-[28px] md:shadow-2xl">
        <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-16 text-center text-white md:flex-none md:pb-8 md:pt-10">
          <span className="flex items-center gap-2 rounded-full border-2 border-green-400 bg-white/10 px-4 py-1.5 font-bold text-green-400">
            <CheckIcon strokeWidth={3} /> You liked this event
          </span>
          <h2 id="liked-title" className="mt-4 text-3xl font-black tracking-tight">
            {event.title}
          </h2>
          <p className="mt-1 text-white/75">
            {formatDay(event.start_time)} · {formatClock(event.start_time)} · {event.location}
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-t-[32px] bg-white px-6 pb-8 pt-3 md:rounded-none">
          <span className="mx-auto h-1.5 w-10 rounded-full bg-zinc-200 md:hidden" />
          <div className="flex items-center gap-4 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl text-orange-600">
              <AlertIcon />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Registration status</p>
              <p className="text-lg font-black text-orange-900">{event.myRegistered ? "Registered" : "Not registered yet"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black tracking-tight">Register to lock in your spot</h3>
            <p className="mt-1 text-zinc-500">
              {event.registration_url
                ? `${event.title} needs a registration with ${event.organization ?? "the host"}. Register first, then we'll find you a ride.`
                : `RSVP so ${event.organization ?? "the host"} knows you're coming, then we'll find you a ride.`}
            </p>
          </div>

          <ol className="flex flex-col gap-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? "bg-crimson text-white" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={i === 0 ? "font-semibold" : "text-zinc-500"}>{step}</span>
              </li>
            ))}
          </ol>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => register(true)}
              className="h-14 rounded-2xl bg-crimson text-lg font-bold text-white shadow-lg shadow-crimson/25 disabled:opacity-60"
            >
              Register Now
            </button>
            {event.registration_url && (
              <button
                type="button"
                disabled={busy}
                onClick={() => register(false)}
                className="h-14 rounded-2xl bg-zinc-100 text-lg font-bold text-zinc-700 disabled:opacity-60"
              >
                I&apos;ve already registered
              </button>
            )}
            <button type="button" onClick={onClose} className="h-10 text-zinc-400">
              Not now, keep swiping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
