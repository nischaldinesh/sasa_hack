"use client";

import { useState, useTransition } from "react";
import { resetMyDemo } from "@/app/discover/actions";

// Bottom of Discover, demo accounts only: resets this account and replays the
// swipe tutorial on this browser for the next person.
export default function DemoResetButton({ name }: { name: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ error?: string; message?: string }>({});

  function reset() {
    if (!window.confirm(`Reset ${name}'s demo? Their swipes, joins, trips, friends and reviews go back to the starting state.`)) return;
    setResult({});
    start(async () => {
      const r = await resetMyDemo();
      setResult(r);
      if (r.error) return;
      try {
        for (const key of Object.keys(window.localStorage)) {
          if (key.startsWith("soonerswipe:hint:")) window.localStorage.removeItem(key);
        }
      } catch {
        // Storage blocked: the tutorial just won't replay on its own.
      }
      // Reload so skipped cards come back, the bell updates and the tutorial plays again.
      window.location.reload();
    });
  }

  return (
    <section className="mx-4 mt-6 flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-zinc-300 p-5 text-center md:mx-auto md:max-w-[420px]">
      <p className="text-sm font-bold text-zinc-600">Demo mode</p>
      <p className="text-xs text-zinc-500">Showing the app to someone new? Start this account over from the beginning.</p>
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="mt-1 h-11 rounded-2xl bg-zinc-900 px-6 font-bold text-white disabled:opacity-60"
      >
        {pending ? "Resetting…" : "Reset demo"}
      </button>
      {result.error && (
        <p role="alert" className="text-sm text-red-600">
          {result.error}
        </p>
      )}
      {result.message && <p className="text-sm font-semibold text-green-700">{result.message}</p>}
    </section>
  );
}
