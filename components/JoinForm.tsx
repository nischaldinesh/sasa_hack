"use client";

import { useActionState, useState } from "react";
import { joinEvent, type ActionResult } from "@/app/events/actions";
import { PICKUP_POINTS, type PickupKey } from "@/lib/places";
import type { Role } from "@/lib/types";

type Props = {
  eventId: string;
  initial: {
    role: Role | null;
    pickup: PickupKey | null;
    seats: number;
    mpg: number;
    depart: string; // datetime-local value in Chicago time
  };
};

const input = "h-12 w-full rounded-xl border border-zinc-300 bg-transparent px-3 text-base dark:border-zinc-700";

export default function JoinForm({ eventId, initial }: Props) {
  const [role, setRole] = useState<Role>(initial.role ?? "rider");
  const [state, action, pending] = useActionState<ActionResult, FormData>(joinEvent, {});
  const joined = initial.role !== null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="role" value={role} />

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
        {(["rider", "driver"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`h-14 rounded-2xl border-2 font-semibold ${
              role === r
                ? "border-red-800 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200"
                : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
            }`}
          >
            {r === "rider" ? "🙋 I need a ride" : "🚗 I can drive"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Pickup point
        <select name="pickup" defaultValue={initial.pickup ?? "union"} className={input}>
          {Object.entries(PICKUP_POINTS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {role === "driver" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Open seats
              <input name="seats" type="number" min={1} max={7} defaultValue={initial.seats} required className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Car mpg
              <input
                name="mpg"
                type="number"
                min={1}
                max={150}
                step="0.1"
                defaultValue={initial.mpg}
                required
                className={input}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Departure time (Central)
            <input name="depart" type="datetime-local" defaultValue={initial.depart} required className={input} />
          </label>
        </>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.message && !pending && <p className="text-sm font-medium text-green-700">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-full bg-red-800 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : joined ? "Update my plan" : role === "driver" ? "Join as driver" : "Join as rider"}
      </button>
    </form>
  );
}
