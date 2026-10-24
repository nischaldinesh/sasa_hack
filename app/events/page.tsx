import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EventsList from "@/components/EventsList";
import { createClient } from "@/lib/supabase/server";
import { getEventSummaries } from "@/lib/queries";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] pb-24 md:px-6 md:py-8">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading events…</p>}>
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
  return <EventsList events={events} />;
}
