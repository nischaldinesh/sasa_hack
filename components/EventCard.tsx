import Link from "next/link";
import { formatEventTime } from "@/lib/time";
import type { EventSummary } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  Career: "from-red-800 to-red-600",
  Sports: "from-orange-700 to-amber-500",
  Social: "from-sky-700 to-sky-500",
  Conference: "from-indigo-800 to-indigo-500",
  Culture: "from-emerald-700 to-teal-500",
  Music: "from-fuchsia-800 to-pink-500",
};

export function categoryGradient(category: string | null) {
  return CATEGORY_COLORS[category ?? ""] ?? "from-zinc-700 to-zinc-500";
}

export function EventStats({ event }: { event: EventSummary }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span>
        <b>{event.going}</b> going
      </span>
      <span>
        <b>{event.interested}</b> interested
      </span>
      {event.friendsGoing > 0 && (
        <span className="text-red-800 dark:text-red-400">
          <b>{event.friendsGoing}</b> {event.friendsGoing === 1 ? "friend" : "friends"} going
        </span>
      )}
      <span>
        <b>{event.openSeats}</b> open {event.openSeats === 1 ? "seat" : "seats"}
      </span>
    </div>
  );
}

export function StatusBadge({ event }: { event: EventSummary }) {
  if (!event.myStatus) return null;
  const label =
    event.myStatus === "going" ? `Going · ${event.myRole === "driver" ? "Driver" : "Rider"}` : "Interested";
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
      {label}
    </span>
  );
}

// Full height card for the swipe deck.
export default function EventCard({ event }: { event: EventSummary }) {
  return (
    <article className="flex h-full select-none flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex flex-1 flex-col justify-end bg-gradient-to-br p-5 text-white ${categoryGradient(event.category)}`}>
        {event.category && (
          <span className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {event.category}
          </span>
        )}
        <h2 className="text-3xl font-bold leading-tight">{event.title}</h2>
        {event.organization && <p className="mt-1 text-white/80">{event.organization}</p>}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          <p>📅 {formatEventTime(event.start_time)}</p>
          <p>📍 {event.location}</p>
        </div>
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
        <Link
          href={`/events/${event.id}`}
          onPointerDownCapture={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-red-800 underline dark:text-red-400"
        >
          Details & rides →
        </Link>
      </div>
    </article>
  );
}

// Compact row for the list view.
export function EventListItem({ event }: { event: EventSummary }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className={`w-2 shrink-0 rounded-full bg-gradient-to-b ${categoryGradient(event.category)}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{event.title}</h3>
          <StatusBadge event={event} />
        </div>
        <p className="text-xs text-zinc-500">
          {formatEventTime(event.start_time)} · {event.location}
        </p>
        <EventStats event={event} />
      </div>
    </Link>
  );
}
