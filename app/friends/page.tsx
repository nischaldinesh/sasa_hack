import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getEventSummaries, getFriends, getMyCategories } from "@/lib/queries";
import { recommendEvents } from "@/lib/recommend";
import { reasonTags } from "@/lib/reasons";
import { formatEventTime } from "@/lib/time";

export const metadata: Metadata = { title: "Friends" };

export default function FriendsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 pb-24 pt-5 md:px-6 md:py-8">
      <h1 className="text-3xl font-black tracking-tight">Friends</h1>
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading friends…</p>}>
        <Friends />
      </Suspense>
    </main>
  );
}

async function Friends() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [friends, events, categories] = await Promise.all([
    getFriends(supabase, user.id),
    getEventSummaries(supabase, user.id),
    getMyCategories(supabase, user.id),
  ]);
  const recs = recommendEvents(events, categories);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1fr] md:items-start">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="mb-3 text-lg font-black">
          Your friends <span className="text-zinc-400">{friends.length}</span>
        </h2>
        {friends.length === 0 ? (
          <p className="text-zinc-500">No friends yet. After a shared ride, add your crewmates from the trip card.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <Avatar name={f.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{f.name}</p>
                  <p className="truncate text-sm text-zinc-500">{[f.major, f.year].filter(Boolean).join(" · ") || "Sooner"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="mb-3 text-lg font-black">Recommended for you</h2>
        {recs.length === 0 ? (
          <p className="text-zinc-500">No recommendations yet. Join an event to get suggestions.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {recs.map(({ event }) => {
              const [reason] = reasonTags({
                friendsGoing: event.friendsGoing,
                going: event.going,
                goingMajors: event.goingMajors,
                newThisWeek: event.newThisWeek,
                openSeats: event.openSeats,
                tags: event.tags,
              });
              return (
                <li key={event.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{event.title}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {formatEventTime(event.start_time)} · {event.going} going
                    </p>
                    {reason && <p className="mt-1 w-fit rounded-lg bg-crimson-soft px-2 py-0.5 text-xs font-semibold text-crimson">{reason}</p>}
                  </div>
                  <Link href={`/events/${event.id}`} className="shrink-0 rounded-xl bg-crimson px-4 py-2 font-bold text-white">
                    Join
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
