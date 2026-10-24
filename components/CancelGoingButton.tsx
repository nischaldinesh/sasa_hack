"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelGoing } from "@/app/events/actions";
import type { Role } from "@/lib/types";

type Variant = "link" | "small" | "block";

const STYLES: Record<Variant, string> = {
  link: "text-sm font-medium text-zinc-500 underline",
  small: "text-xs font-semibold text-zinc-500 underline",
  block: "h-12 w-full rounded-2xl border-2 border-red-200 bg-white font-bold text-red-600",
};

// Cancel going to an event. Works even after matching: a rider leaves the car,
// a driver's trip is cancelled (its riders go back to finding a ride).
export default function CancelGoingButton({
  eventId,
  eventTitle,
  role,
  label = "Cancel going",
  variant = "link",
  redirectTo,
}: {
  eventId: string;
  eventTitle: string;
  role: Role | null;
  label?: string;
  variant?: Variant;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    const impact =
      role === "driver"
        ? "Your trip will be cancelled and any riders in your car go back to finding a ride."
        : "If you're in a car, you'll leave it and free your seat.";
    if (!window.confirm(`Cancel going to ${eventTitle}? ${impact}`)) return;
    setError(null);
    start(async () => {
      const result = await cancelGoing(eventId);
      if (result.error) return setError(result.error);
      window.dispatchEvent(new Event("nav:refresh"));
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <span className={`flex flex-col ${variant === "block" ? "items-stretch" : "items-end"} gap-1`}>
      <button type="button" onClick={cancel} disabled={pending} className={`${STYLES[variant]} disabled:opacity-60`}>
        {pending ? "Cancelling…" : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
