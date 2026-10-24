"use client";

import { useEffect } from "react";

export default function TripsError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold">Couldn&apos;t load your trips.</p>
      <p className="text-sm text-zinc-500">Check your connection and try again.</p>
      <button type="button" onClick={() => retry()} className="h-12 rounded-full bg-red-800 px-6 font-semibold text-white">
        Try again
      </button>
    </main>
  );
}
