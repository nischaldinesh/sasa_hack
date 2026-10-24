"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PickupPicker from "@/components/PickupPicker";
import { CarIcon, CheckIcon, LockIcon, UserIcon } from "@/components/Icons";
import { joinEvent, leaveEvent, type ActionResult } from "@/app/events/actions";
import type { PickupKey } from "@/lib/places";
import type { Role } from "@/lib/types";

type Props = {
  eventId: string;
  joined: boolean;
  locked: boolean; // in a trip for this event: role and attendance can't change
  verified: boolean; // driver's license check approved
  driverPerk: string | null;
  initial: {
    role: Role | null; // null until the user picks; never preselected for new joins
    pickup: PickupKey | null;
    seats: number;
    mpg: number;
    splitGas: boolean;
    depart: string; // datetime-local value in Chicago time
  };
};

const label = "text-xs font-bold uppercase tracking-wider text-zinc-500";
const field = "h-14 w-full rounded-2xl bg-zinc-100 px-4 text-base outline-none focus:ring-2 focus:ring-crimson";

function RoleCard({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  subtitle,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-3xl border-2 bg-white p-5 transition ${
        selected ? "border-crimson shadow-lg shadow-crimson/10" : "border-zinc-200"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        className="flex w-full items-center gap-4 text-left"
      >
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${
            selected ? "bg-crimson-soft text-crimson" : "bg-zinc-100 text-zinc-400"
          }`}
        >
          {icon}
        </span>
        <span className="flex-1">
          <span className={`block text-xl font-bold ${selected ? "" : "text-zinc-500"}`}>{title}</span>
          <span className="block text-zinc-500">{subtitle}</span>
        </span>
        {selected && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-crimson text-white">
            <CheckIcon strokeWidth={3} />
          </span>
        )}
      </button>
      {selected && <div className="mt-5 flex flex-col gap-4">{children}</div>}
    </section>
  );
}

export default function HowGoingForm({ eventId, joined, locked, verified, driverPerk, initial }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(initial.role);
  const [seats, setSeats] = useState(initial.seats);
  const [splitGas, setSplitGas] = useState(initial.splitGas);
  const [state, action, pending] = useActionState<ActionResult & { next?: string }, FormData>(joinEvent, {});
  const [leaveResult, setLeaveResult] = useState<ActionResult>({});
  const [leaving, startLeaving] = useTransition();

  // Go to the people deck once per successful join. Effects re-run when Next
  // shows this hidden page again, so remember which result was handled;
  // otherwise pressing back from the deck would bounce straight back to it.
  const handled = useRef<typeof state | null>(null);
  useEffect(() => {
    if (state.next && handled.current !== state) {
      handled.current = state;
      router.push(state.next);
    }
  }, [state, router]);

  function leave() {
    if (!window.confirm("Leave this event? Your swipes for it will be cleared.")) return;
    startLeaving(async () => setLeaveResult(await leaveEvent(eventId)));
  }

  const pickupAndTime = (
    <>
      <div className="flex flex-col gap-2">
        <span className={label}>Pickup area</span>
        <PickupPicker name="pickup" defaultValue={initial.pickup} />
      </div>
      <label className="flex flex-col gap-2">
        <span className={label}>Departure time (Central)</span>
        <input name="depart" type="datetime-local" defaultValue={initial.depart} required className={field} />
      </label>
    </>
  );

  return (
    <form action={action} className="flex flex-col gap-4 pb-28 md:pb-0">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="role" value={role ?? ""} />
      <h2 className="text-2xl font-black tracking-tight">How are you going?</h2>
      {locked && (
        <p className="flex items-center gap-2 rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-600">
          <LockIcon /> You&apos;re in a trip for this event, so your role is locked.
        </p>
      )}

      <div role="radiogroup" aria-label="How are you going" className="flex flex-col gap-4">
        <RoleCard
          selected={role === "driver"}
          disabled={locked && role !== "driver"}
          onSelect={() => setRole("driver")}
          icon={<CarIcon />}
          title="I'm driving"
          subtitle="Offer seats to riders on your route"
        >
          {driverPerk && (
            <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
              🎁 <b>Drivers get:</b> {driverPerk}
            </p>
          )}
          {verified ? (
            <p className="text-sm font-semibold text-green-600">✓ Verified driver</p>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-crimson-soft p-4">
              <div>
                <p className="font-bold text-crimson">Verify your license to drive</p>
                <p className="text-sm text-zinc-600">Add your plate and a license photo. Takes a minute.</p>
              </div>
              <Link
                href={`/profile/verify?next=${encodeURIComponent(`/events/${eventId}`)}`}
                className="shrink-0 rounded-xl bg-crimson px-4 py-2.5 font-bold text-white"
              >
                Verify
              </Link>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className={label}>Available seats</span>
              <div className="flex h-14 items-center justify-between rounded-2xl bg-zinc-100 px-2">
                <button
                  type="button"
                  aria-label="Fewer seats"
                  onClick={() => setSeats((s) => Math.max(1, s - 1))}
                  className="h-10 w-10 rounded-xl text-2xl text-zinc-600 disabled:opacity-30"
                  disabled={seats <= 1}
                >
                  −
                </button>
                <span className="text-xl font-bold" aria-live="polite">
                  {seats}
                </span>
                <button
                  type="button"
                  aria-label="More seats"
                  onClick={() => setSeats((s) => Math.min(7, s + 1))}
                  className="h-10 w-10 rounded-xl text-2xl text-zinc-600 disabled:opacity-30"
                  disabled={seats >= 7}
                >
                  +
                </button>
              </div>
              <input type="hidden" name="seats" value={seats} />
            </div>
            <label className="flex flex-col gap-2">
              <span className={label}>Car mpg</span>
              <span className="relative">
                <input name="mpg" type="number" min={1} max={150} step="0.1" defaultValue={initial.mpg} required className={field} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">mpg</span>
              </span>
            </label>
          </div>
          {pickupAndTime}
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-zinc-100 p-4">
            <span>
              <span className="block font-bold">Split gas cost</span>
              <span className="block text-sm text-zinc-500">App calculates fair share</span>
            </span>
            <input
              type="checkbox"
              name="splitGas"
              checked={splitGas}
              onChange={(e) => setSplitGas(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-8 w-14 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-crimson peer-focus-visible:ring-2 peer-focus-visible:ring-crimson after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-6"
            />
          </label>
        </RoleCard>

        <RoleCard
          selected={role === "rider"}
          disabled={locked && role !== "rider"}
          onSelect={() => setRole("rider")}
          icon={<UserIcon />}
          title="I need a ride"
          subtitle="Find drivers going your way"
        >
          {pickupAndTime}
        </RoleCard>
      </div>

      {(state.error || leaveResult.error) && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.error ?? leaveResult.error}
        </p>
      )}
      {leaveResult.message && <p className="text-sm font-medium text-green-700">{leaveResult.message}</p>}

      {joined && !locked && (
        <button type="button" onClick={leave} disabled={leaving} className="text-sm font-medium text-zinc-500 underline">
          {leaving ? "Leaving…" : "Leave this event"}
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0">
        <button
          type="submit"
          disabled={pending || role === null || (role === "driver" && !verified)}
          className="h-14 w-full rounded-2xl bg-crimson text-lg font-bold text-white shadow-lg shadow-crimson/25 disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : role === "driver"
              ? "Join as Driver — Find Riders"
              : role === "rider"
                ? "Join as Rider — Find Drivers"
                : "Choose driving or riding"}
        </button>
      </div>
    </form>
  );
}
