"use client";

import { useEffect } from "react";

export default function FriendsError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-black">Couldn&apos;t load this page.</p>
      <p className="text-sm text-zinc-500">Check your connection and try again.</p>
      <button type="button" onClick={() => retry()} className="h-12 rounded-2xl bg-crimson px-6 font-bold text-white">
        Try again
      </button>
    </main>
  );
}
