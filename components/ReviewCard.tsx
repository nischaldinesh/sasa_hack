"use client";

import { useState, useTransition } from "react";
import { StarIcon } from "@/components/Icons";
import { submitReview } from "@/app/trips/actions";

// Rider's review of the driver, asked at drop off (estimated arrival time).
export default function ReviewCard({
  tripId,
  driverName,
  arrived,
  existing,
}: {
  tripId: string;
  driverName: string;
  arrived: boolean;
  existing: { rating: number; comment: string | null } | null;
}) {
  const [open, setOpen] = useState(arrived || !!existing);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saved, setSaved] = useState(!!existing);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const first = driverName.split(" ")[0];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between rounded-3xl bg-white p-5 text-left font-bold shadow-sm ring-1 ring-zinc-100"
      >
        <span>
          Dropped off? Rate your ride with {first}
          <span className="block text-sm font-normal text-zinc-500">We&apos;ll also ask when you arrive.</span>
        </span>
        <StarIcon className="text-2xl text-amber-400" />
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <h2 className="text-lg font-black">{saved ? `You rated ${first}` : arrived ? `You've arrived! How was your ride with ${first}?` : `How was your ride with ${first}?`}</h2>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => {
              setRating(n);
              setSaved(false);
            }}
            className={`text-4xl transition active:scale-90 ${n <= rating ? "text-amber-400" : "text-zinc-200"}`}
          >
            <StarIcon fill="currentColor" />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSaved(false);
        }}
        maxLength={500}
        rows={2}
        placeholder="Anything to share? (optional)"
        className="rounded-2xl bg-zinc-100 p-3 outline-none focus:ring-2 focus:ring-crimson"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending || rating === 0 || saved}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await submitReview(tripId, rating, comment);
            if (result.error) setError(result.error);
            else setSaved(true);
          })
        }
        className="h-12 rounded-2xl bg-crimson font-bold text-white disabled:opacity-50"
      >
        {saved ? "Review saved ✓" : pending ? "Saving…" : "Submit review"}
      </button>
    </section>
  );
}
