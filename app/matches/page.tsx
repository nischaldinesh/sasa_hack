import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import MarkMatchesSeen from "@/components/MarkMatchesSeen";
import { createClient } from "@/lib/supabase/server";
import { getMatches } from "@/lib/queries";
import { formatEventTime } from "@/lib/time";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-24 pt-5 md:px-6 md:py-8">
      <h1 className="text-3xl font-black tracking-tight">Matches</h1>
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading matches…</p>}>
        <Matches />
      </Suspense>
    </main>
  );
}

async function Matches() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const matches = await getMatches(supabase, user.id);
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-sm">
        <p className="font-black">No matches yet.</p>
        <p className="text-sm text-zinc-500">Join an event and swipe on people going your way.</p>
        <Link href="/discover" className="rounded-2xl bg-crimson px-5 py-2.5 font-bold text-white">
          Discover events
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      <MarkMatchesSeen />
      {matches.map((m) => (
        <li key={`${m.tripId}-${m.partnerName}-${m.matchedAt}`}>
          <Link href={`/trips/${m.tripId}`} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <Avatar name={m.partnerName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {m.partnerName} <span className="font-normal text-zinc-500">· {m.partnerRole}</span>
              </p>
              <p className="truncate text-sm text-zinc-500">
                {m.eventTitle} · matched {formatEventTime(m.matchedAt)}
              </p>
            </div>
            {m.unseen && <span className="rounded-full bg-crimson px-2.5 py-1 text-xs font-bold text-white">New</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
