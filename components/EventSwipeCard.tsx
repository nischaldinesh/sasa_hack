import EventArt from "@/components/EventArt";
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
      <EventArt category={event.category} className="absolute inset-0" />
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
      </div>
    </article>
  );
}

// Desktop side panel next to the Discover card.
export function EventDetailsPanel({ event }: { event: EventSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        {event.category && <p className="text-xs font-bold uppercase tracking-wider text-crimson">{event.category}</p>}
        <h3 className="mt-1 text-xl font-black leading-tight">{event.title}</h3>
        {event.organization && <p className="text-sm text-zinc-500">Hosted by {event.organization}</p>}
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex gap-2">
          <CalendarIcon className="mt-0.5 shrink-0 text-zinc-400" />
          <dd>{formatTimeRange(event.start_time, event.end_time)}</dd>
        </div>
        <div className="flex gap-2">
          <PinIcon className="mt-0.5 shrink-0 text-zinc-400" />
          <dd>{venueLine(event)}</dd>
        </div>
        <div className="flex gap-2">
          <UsersIcon className="mt-0.5 shrink-0 text-zinc-400" />
          <dd>
            {event.going} going · {event.interested} interested · {event.openSeats} open seats
          </dd>
        </div>
      </dl>
      {event.friendNames.length > 0 && (
        <p className="text-sm">
          <b>Friends going:</b> {event.friendNames.join(", ")}
        </p>
      )}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {tag}
            </span>
          ))}
        </div>
      )}
      {event.requires_registration && (
        <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">This event needs registration. We&apos;ll walk you through it.</p>
      )}
    </div>
  );
}
