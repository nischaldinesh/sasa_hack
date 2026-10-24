import { ClockIcon, PinIcon, StarIcon, CarIcon } from "@/components/Icons";
import { formatMiles } from "@/lib/deck";
import Avatar from "@/components/Avatar";
import { formatClock, formatEventTime } from "@/lib/time";
import type { PersonCardData } from "@/lib/types";

function statusPill(person: PersonCardData) {
  return person.role === "driver"
    ? { text: `Has ${person.seatsLeft} ${person.seatsLeft === 1 ? "seat" : "seats"}`, className: "bg-green-50 text-green-700", dot: "bg-green-600" }
    : { text: "Needs a ride", className: "bg-crimson-soft text-crimson", dot: "bg-crimson" };
}

function OrgBadges({ orgs }: { orgs: string[] }) {
  return (
    <>
      {orgs.map((org, i) =>
        i === 0 ? (
          <span key={org} className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            <PinIcon /> {org}
          </span>
        ) : (
          <span key={org} className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
            <StarIcon fill="currentColor" /> {org} member
          </span>
        ),
      )}
    </>
  );
}

// People deck card (mockup 6).
export default function PersonCard({ person }: { person: PersonCardData }) {
  const pill = statusPill(person);
  return (
    <article className="flex h-full select-none flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-zinc-300/50">
      <div
        className={`relative flex min-h-[38%] flex-col items-center justify-center bg-gradient-to-br ${
          person.role === "driver" ? "from-rose-50 to-amber-50" : "from-blue-100 to-violet-100"
        }`}
      >
        {person.starredMe && (
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-white shadow">
            <StarIcon fill="currentColor" /> Starred you
          </span>
        )}
        <span className={`absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${pill.className}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${pill.dot}`} /> {pill.text}
        </span>
        <Avatar name={person.name} size="xl" className="h-32 w-32 border-4 border-white shadow-lg" />
        <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-green-600 shadow-sm">
          <PinIcon />{" "}
          {person.detourMiles != null
            ? person.detourMiles < 0.1
              ? "Right on their route"
              : `On their route · +${person.detourMiles.toFixed(1)} mi`
            : `${formatMiles(person.distanceMiles)} from your pickup`}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-black tracking-tight">{person.name}</h3>
            <p className="text-zinc-500">{[person.major, person.year].filter(Boolean).join(" · ")}</p>
          </div>
          {person.pickupPoint && (
            // Long spot names wrap here instead of squeezing the person's name.
            <div className="max-w-[45%] text-right">
              <p className="text-sm text-zinc-400">{person.role === "driver" ? "Starts from" : "Pickup"}</p>
              <p className="font-bold leading-snug">{person.pickupPoint}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {person.departTime && (
            <span className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700">
              <ClockIcon /> {formatClock(person.departTime)} depart
            </span>
          )}
          {person.role === "driver" && person.mpg && (
            <span className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700">
              <CarIcon /> {person.mpg} mpg
            </span>
          )}
          {person.role === "driver" && person.verified && (
            <span className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
              ✓ Verified driver
            </span>
          )}
          {person.role === "driver" && (
            <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
              <StarIcon fill="currentColor" /> {person.rating != null ? `${person.rating.toFixed(1)} (${person.reviews})` : "New driver"}
            </span>
          )}
          <OrgBadges orgs={person.orgs} />
        </div>
        {person.bio && (
          <blockquote className="line-clamp-4 rounded-xl border-l-4 border-crimson bg-zinc-50 px-4 py-3 text-zinc-500">
            &ldquo;{person.bio}&rdquo;
          </blockquote>
        )}
      </div>
    </article>
  );
}

// Back of the person card: full details (tap to flip).
export function PersonBackCard({ person }: { person: PersonCardData }) {
  return (
    <article className="flex h-full select-none flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-zinc-300/50">
      <div className="flex shrink-0 items-center gap-4 border-b border-zinc-100 p-5">
        <Avatar name={person.name} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-crimson">{person.role === "driver" ? "Driver" : "Rider"}</p>
          <h3 className="truncate text-xl font-black">{person.name}</h3>
          <p className="truncate text-sm text-zinc-500">{[person.major, person.year].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {person.bio && (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">About</h4>
            <p className="mt-1 leading-relaxed text-zinc-700">{person.bio}</p>
          </section>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-400">Pickup</dt>
          <dd className="font-semibold">{person.pickupPoint ?? "—"}</dd>
          <dt className="text-zinc-400">Distance</dt>
          <dd className="font-semibold">{formatMiles(person.distanceMiles)} from your pickup</dd>
          {person.detourMiles != null && (
            <>
              <dt className="text-zinc-400">Detour</dt>
              <dd className="font-semibold">+{person.detourMiles.toFixed(1)} mi for them to pick you up</dd>
            </>
          )}
          <dt className="text-zinc-400">Leaves</dt>
          <dd className="font-semibold">{person.departTime ? formatEventTime(person.departTime) : "—"}</dd>
          {person.role === "driver" && (
            <>
              <dt className="text-zinc-400">Seats</dt>
              <dd className="font-semibold">{person.seatsLeft} open</dd>
              <dt className="text-zinc-400">Car</dt>
              <dd className="font-semibold">{person.mpg ? `${person.mpg} mpg` : "—"}</dd>
              <dt className="text-zinc-400">Rating</dt>
              <dd className="font-semibold">{person.rating != null ? `★ ${person.rating.toFixed(1)} from ${person.reviews} rides` : "New driver"}</dd>
              <dt className="text-zinc-400">License</dt>
              <dd className="font-semibold">{person.verified ? "✓ Verified" : "Not verified"}</dd>
            </>
          )}
        </dl>
        {person.orgs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <OrgBadges orgs={person.orgs} />
          </div>
        )}
      </div>
      <p className="shrink-0 border-t border-zinc-100 py-3 text-center text-xs font-semibold text-zinc-400">Tap to flip back</p>
    </article>
  );
}
