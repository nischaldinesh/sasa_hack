"use client";

import { useState, useTransition } from "react";
import Avatar from "@/components/Avatar";
import { respondToRequest, sendFriendRequests } from "@/app/friends/actions";
import type { FriendStatus } from "@/lib/types";

type Crewmate = { id: string; name: string; status: FriendStatus };

const LABELS: Record<FriendStatus, string> = {
  friends: "Friends ✓",
  sent: "Request sent",
  received: "Wants to be friends",
  none: "",
};

// "Add your crewmates as friends": sends requests; each person decides.
export default function CrewFriends({ crew }: { crew: Crewmate[] }) {
  const [statuses, setStatuses] = useState(() => new Map(crew.map((c) => [c.id, c.status])));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toAsk = crew.filter((c) => statuses.get(c.id) === "none");

  function addAll() {
    setError(null);
    start(async () => {
      const result = await sendFriendRequests(toAsk.map((c) => c.id));
      if (result.error) return setError(result.error);
      setStatuses((prev) => new Map([...prev].map(([id, s]) => [id, s === "none" ? "sent" : s])));
    });
  }

  function accept(id: string) {
    setError(null);
    start(async () => {
      const result = await respondToRequest(id, true);
      if (result.error) return setError(result.error);
      setStatuses((prev) => new Map(prev).set(id, "friends"));
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 -space-x-3">
          {crew.slice(0, 3).map((m) => (
            <Avatar key={m.id} name={m.name} size="md" className="ring-4 ring-white" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">Add your crewmates as friends</p>
          <p className="text-sm text-zinc-500">They get a request · See their future events · Ride together again</p>
        </div>
        {toAsk.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={addAll}
            className="shrink-0 rounded-2xl bg-crimson px-5 py-3 text-lg font-bold text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Add All"}
          </button>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100">
        {crew.map((m) => {
          const status = statuses.get(m.id) ?? "none";
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-semibold">{m.name}</span>
              {status === "received" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => accept(m.id)}
                  className="rounded-xl bg-green-600 px-3 py-1.5 font-bold text-white disabled:opacity-60"
                >
                  Accept request
                </button>
              ) : (
                <span className={status === "friends" ? "font-semibold text-green-600" : "text-zinc-500"}>
                  {LABELS[status] || "Not friends yet"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
