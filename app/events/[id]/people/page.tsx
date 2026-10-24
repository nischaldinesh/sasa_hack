import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DriverRouteView from "@/components/DriverRouteView";
import PeopleDeck from "@/components/PeopleDeck";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getDriverRoute, getPartners, getPersonDeck } from "@/lib/queries";

export const metadata: Metadata = { title: "Find your ride" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PeoplePage({ params }: PageProps<"/events/[id]/people">) {
  return (
    <main className="mx-auto w-full max-w-[1100px] pb-10 md:px-6 md:py-8">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Finding people going your way…</p>}>
        <People params={params} />
      </Suspense>
    </main>
  );
}

async function People({ params }: { params: PageProps<"/events/[id]/people">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: event, error }, deck, { partners }] = await Promise.all([
    supabase.from("events").select("id, title").eq("id", id).maybeSingle(),
    // Stars toward me are read server side with the service role (RLS hides others' swipes).
    getPersonDeck(supabase, user.id, id, createAdminClient()),
    getPartners(supabase, user.id, id),
  ]);
  if (error) throw new Error(error.message);
  if (!event) notFound();
  if (deck.status === "not-going") redirect(`/events/${id}`);

  // Drivers don't swipe: they see the riders matched to their route.
  if (deck.myRole === "driver") {
    const route = await getDriverRoute(supabase, user.id, id, createAdminClient());
    if (!route) redirect(`/events/${id}`);
    return <DriverRouteView meId={user.id} eventId={event.id} route={route} initialPartners={partners} />;
  }

  return <PeopleDeck meId={user.id} eventId={event.id} eventTitle={event.title} deck={deck} initialPartners={partners} />;
}
