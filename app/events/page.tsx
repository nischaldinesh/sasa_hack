import { Suspense } from "react";
import { redirect } from "next/navigation";
import EventsView from "@/components/EventsView";
import { createClient } from "@/lib/supabase/server";
import { getEventSummaries } from "@/lib/queries";
import { signOut } from "./actions";

export default function EventsPage() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-red-800 dark:text-red-500">Events</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            Sign out
          </button>
        </form>
      </header>
      <Suspense fallback={<EventsSkeleton />}>
        <EventsData />
      </Suspense>
    </main>
  );
}

async function EventsData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const events = await getEventSummaries(supabase, user.id);
  return <EventsView events={events} />;
}

function EventsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="h-12 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-[70dvh] min-h-[420px] animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
      <p className="text-center text-sm text-zinc-500">Loading events…</p>
    </div>
  );
}
