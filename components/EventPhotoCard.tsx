"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import CancelGoingButton from "@/components/CancelGoingButton";
import EventImage from "@/components/EventImage";
import { EventBackCard } from "@/components/EventSwipeCard";
import { XIcon } from "@/components/Icons";
import { eventBlurb } from "@/lib/events";
import { photoCredit } from "@/lib/photoCredits";
import { formatClock, formatDay } from "@/lib/time";
import type { EventSummary } from "@/lib/types";

function DetailsModal({ event, onClose }: { event: EventSummary; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${event.title} details`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6"
    >
      <div onClick={(e) => e.stopPropagation()} className="relative h-[85dvh] w-full max-w-md md:h-[640px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl text-white"
        >
          <XIcon />
        </button>
        <EventBackCard event={event} />
      </div>
    </div>
  );
}

// Events page card: photo on top, title, when and where, a live status line,
// Join In, people going and more details.
export default function EventPhotoCard({ event }: { event: EventSummary }) {
  const [open, setOpen] = useState(false);
  // Close the details popup when the Events page is hidden.
  useLayoutEffect(() => () => setOpen(false), []);
  const going = event.myStatus === "going";
  const extra = Math.max(0, event.going - event.goingNames.length);
  const credit = photoCredit(event.image_url);

  return (
    <article className="flex flex-col overflow-hidden rounded-[28px] bg-white shadow-lg shadow-zinc-200/70 ring-1 ring-zinc-100">
      <div className="relative">
        <Link href={`/events/${event.id}`} className="relative block aspect-[16/9] overflow-hidden bg-zinc-200">
          <EventImage event={event} />
          {event.category && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-crimson backdrop-blur">
              {event.category}
            </span>
          )}
          {event.driver_perk && (
            <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
              🎁 Driver perk
            </span>
          )}
        </Link>
        {credit && (
          <p className="absolute bottom-2 right-2 max-w-[85%] truncate rounded-md bg-black/45 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
            {credit.source ? (
              <a href={credit.source} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Photo: {credit.author}
              </a>
            ) : (
              credit.author
            )}
            {" · "}
            {credit.licenseUrl ? (
              <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {credit.license}
              </a>
            ) : (
              credit.license
            )}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 bg-zinc-50 p-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold leading-snug tracking-tight">{event.title}</h3>
            <p className="mt-0.5 text-sm font-medium text-zinc-500">
              {formatDay(event.start_time)} · {formatClock(event.start_time)} · {event.location}
            </p>
            <p className="mt-1.5 text-zinc-600">{eventBlurb(event)}</p>
          </div>
          {going ? (
            <span className="flex shrink-0 flex-col items-center gap-1.5">
              <Link
                href={`/events/${event.id}/people`}
                className="rounded-full bg-green-600 px-5 py-2.5 font-semibold text-white shadow-md"
              >
                Going ✓
              </Link>
              <CancelGoingButton
                eventId={event.id}
                eventTitle={event.title}
                role={event.myRole}
                label="Cancel"
                variant="small"
              />
            </span>
          ) : (
            <Link
              href={`/events/${event.id}`}
              className="shrink-0 rounded-full bg-crimson px-6 py-2.5 font-semibold text-white shadow-md shadow-crimson/30"
            >
              Join In
            </Link>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center" aria-label={`${event.going} going`}>
            {event.goingNames.map((name, i) => (
              <Avatar key={`${name}-${i}`} name={name} size="sm" className="-ml-2 ring-[3px] ring-zinc-50 first:ml-0" />
            ))}
            {extra > 0 && (
              <span className="-ml-2 flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-2 text-sm font-semibold text-zinc-600 ring-[3px] ring-zinc-50">
                +{extra}
              </span>
            )}
            {event.going === 0 && <span className="text-sm text-zinc-400">No one yet</span>}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-zinc-600"
          >
            more details{" "}
            <span aria-hidden className="text-lg">
              ›
            </span>
          </button>
        </div>
      </div>

      {open && <DetailsModal event={event} onClose={() => setOpen(false)} />}
    </article>
  );
}
