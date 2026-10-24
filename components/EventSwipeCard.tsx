import EventImage, { creditText } from "@/components/EventImage";
import { CalendarIcon, PinIcon, TrendingIcon, UsersIcon } from "@/components/Icons";
import { isTrending } from "@/lib/events";
import { eventChips } from "@/lib/reasons";
import { formatTimeRange } from "@/lib/time";
import type { EventSummary } from "@/lib/types";

export function chipsFor(event: EventSummary): string[] {
  return eventChips({
    friendsGoing: event.friendsGoing,
    going: event.going,
    goingMajors: event.goingMajors,
    newThisWeek: event.newThisWeek,
    openSeats: event.openSeats,
    tags: event.tags,
  });
}

export function venueLine(event: Pick<EventSummary, "location" | "city">): string {
  return event.city ? `${event.location} · ${event.city}` : event.location;
}

// Discover card: illustrated background with event details over it.
export default function EventSwipeCard({ event }: { event: EventSummary }) {
  return (
    <article className="relative h-full select-none overflow-hidden rounded-[28px] bg-zinc-900 text-white shadow-2xl shadow-zinc-400/40">
      <EventImage event={event} className="absolute inset-0" sizes="(min-width: 768px) 420px, 100vw" />
      {event.image_url && (
        // Keep the white text readable over any photo.
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" aria-hidden />
      )}
      {event.driver_perk && (
        <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold text-amber-950 shadow">
          🎁 Driver perk
        </span>
      )}
      {isTrending(event) && (
        <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-sm font-bold text-green-600 shadow">
          <TrendingIcon /> +{event.newThisWeek} this week
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6">
        {event.category && (
          <span className="w-fit rounded-md bg-crimson px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider">
            {event.category}
          </span>
        )}
        <h2 className="text-3xl font-black leading-tight tracking-tight">{event.title}</h2>
        {event.organization && <p className="text-white/75">Hosted by {event.organization}</p>}
        <div className="mt-1 flex flex-col gap-1.5 text-[15px] font-semibold">
          <p className="flex items-center gap-2.5">
            <CalendarIcon className="shrink-0 text-lg" /> {formatTimeRange(event.start_time, event.end_time)}
          </p>
          <p className="flex items-center gap-2.5">
            <PinIcon className="shrink-0 text-lg" /> {venueLine(event)}
          </p>
          <p className="flex items-center gap-2.5">
            <UsersIcon className="shrink-0 text-lg" /> {event.going} going · {event.interested} interested
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {chipsFor(event).map((chip) => (
            <span key={chip} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur">
              {chip}
            </span>
          ))}
        </div>
        {creditText(event.image_url) && <p className="mt-1 text-[10px] text-white/60">{creditText(event.image_url)}</p>}
      </div>
    </article>
  );
}

// Back of the Discover card: description and full details (tap to flip).
export function EventBackCard({ event }: { event: EventSummary }) {
  const chips = chipsFor(event);
  return (
    <article className="flex h-full select-none flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-zinc-400/40">
      <div className="relative h-28 shrink-0 overflow-hidden bg-zinc-900">
        <EventImage event={event} className="absolute inset-0" sizes="420px" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          {event.category && (
            <p className="text-xs font-extrabold uppercase tracking-wider text-white/80">{event.category}</p>
          )}
          <h2 className="truncate text-xl font-black">{event.title}</h2>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">About</h3>
          <p className="mt-1 leading-relaxed text-zinc-700">
            {event.description ?? `${event.title}${event.organization ? `, hosted by ${event.organization}` : ""}.`}
          </p>
        </section>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex gap-2.5">
            <CalendarIcon className="mt-0.5 shrink-0 text-zinc-400" />
            <dd>{formatTimeRange(event.start_time, event.end_time)}</dd>
          </div>
          <div className="flex gap-2.5">
            <PinIcon className="mt-0.5 shrink-0 text-zinc-400" />
            <dd>{venueLine(event)}</dd>
          </div>
          <div className="flex gap-2.5">
            <UsersIcon className="mt-0.5 shrink-0 text-zinc-400" />
            <dd>
              {event.going} going · {event.interested} interested · {event.openSeats} open{" "}
              {event.openSeats === 1 ? "seat" : "seats"}
            </dd>
          </div>
        </dl>
        {event.friendNames.length > 0 && (
          <p className="text-sm">
            <b>Friends going:</b> {event.friendNames.join(", ")}
          </p>
        )}
        {event.driver_perk && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            🎁 <b>Drivers get:</b> {event.driver_perk}
          </p>
        )}
        {(chips.length > 0 || event.tags.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {[...new Set([...chips, ...event.tags])].map((chip) => (
              <span key={chip} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {chip}
              </span>
            ))}
          </div>
        )}
        <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">
          {event.registration_url ? "This event needs registration." : "RSVP in the app."} Swipe right and we&apos;ll
          walk you through it.
        </p>
      </div>
      <p className="shrink-0 border-t border-zinc-100 py-3 text-center text-xs font-semibold text-zinc-400">
        Tap to flip back
      </p>
    </article>
  );
}
