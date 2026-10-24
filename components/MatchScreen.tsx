"use client";

import Link from "next/link";

export type Match = { names: string[]; tripId: string };

export default function MatchScreen({
  match,
  eventTitle,
  onClose,
}: {
  match: Match;
  eventTitle: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-zinc-900">
        <p className="text-6xl" aria-hidden>
          🎉
        </p>
        <h2 id="match-title" className="text-3xl font-black text-red-800 dark:text-red-400">
          It&apos;s a match!
        </h2>
        <p className="text-zinc-600 dark:text-zinc-300">
          You and <b>{match.names.join(" and ")}</b> are riding together to <b>{eventTitle}</b>.
        </p>
        <Link
          href={`/trips/${match.tripId}`}
          className="flex h-12 w-full items-center justify-center rounded-full bg-red-800 font-semibold text-white"
        >
          View trip
        </Link>
        <button type="button" onClick={onClose} className="h-12 w-full rounded-full font-medium text-zinc-500">
          Keep swiping
        </button>
      </div>
    </div>
  );
}
