import { formatMiles } from "@/lib/deck";
import { formatEventTime } from "@/lib/time";
import type { PersonCardData } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Full height card for the person deck on the event page.
export default function PersonCard({ person }: { person: PersonCardData }) {
  const isDriver = person.role === "driver";
  return (
    <article className="flex h-full select-none flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-3 p-5 text-white ${
          isDriver ? "bg-gradient-to-br from-red-900 to-red-600" : "bg-gradient-to-br from-zinc-800 to-zinc-500"
        }`}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
          {initials(person.name)}
        </div>
        <h3 className="text-center text-3xl font-bold">{person.name}</h3>
        {person.major && <p className="text-white/80">{person.major}</p>}
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {isDriver ? "🚗 Driver" : "🙋 Rider"}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-5 text-sm">
        <p className="text-base font-semibold text-red-800 dark:text-red-400">
          {formatMiles(person.distanceMiles)} from your pickup
        </p>
        {person.pickupPoint && <p>📍 Pickup: {person.pickupPoint}</p>}
        {isDriver && (
          <>
            {person.departTime && <p>🕒 Leaves {formatEventTime(person.departTime)}</p>}
            <p>
              💺 {person.seatsLeft} {person.seatsLeft === 1 ? "seat" : "seats"} left
              {person.mpg ? ` · ${person.mpg} mpg` : ""}
            </p>
          </>
        )}
        {person.interests.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {person.interests.map((interest) => (
              <span key={interest} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800">
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
