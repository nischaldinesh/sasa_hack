"use client";

import { useState, useTransition } from "react";
import { respondToRequest } from "@/app/friends/actions";

export default function FriendRequestActions({ fromId }: { fromId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function respond(accept: boolean) {
    setError(null);
    start(async () => {
      const r = await respondToRequest(fromId, accept);
      if (r.error) setError(r.error);
      else {
        setResult(accept ? "Friends ✓" : "Declined");
        window.dispatchEvent(new Event("nav:refresh"));
      }
    });
  }

  if (result) return <span className={`text-sm font-semibold ${result === "Declined" ? "text-zinc-400" : "text-green-600"}`}>{result}</span>;
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => respond(false)} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-600">
          Decline
        </button>
        <button type="button" disabled={pending} onClick={() => respond(true)} className="rounded-xl bg-crimson px-3 py-2 text-sm font-bold text-white">
          Accept
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
