"use client";

import { useState, useTransition } from "react";
import { addFriends } from "@/app/friends/actions";

export default function AddCrewButton({ ids, alreadyFriends }: { ids: string[]; alreadyFriends: boolean }) {
  const [done, setDone] = useState(alreadyFriends);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return <span className="rounded-2xl bg-green-50 px-4 py-3 font-bold text-green-700">Friends ✓</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await addFriends(ids);
            if (result.error) setError(result.error);
            else setDone(true);
          })
        }
        className="rounded-2xl bg-crimson px-5 py-3 text-lg font-bold text-white disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add All"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
