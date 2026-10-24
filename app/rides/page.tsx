import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RidesView from "@/components/RidesView";
import { createClient } from "@/lib/supabase/server";
import { getMyTrips, getRecentReviews, getRideOffers } from "@/lib/queries";

export const metadata: Metadata = { title: "Rides" };

export default function RidesPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] pb-24 md:px-6 md:py-8">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading rides…</p>}>
        <Rides />
      </Suspense>
    </main>
  );
}

async function Rides() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [offers, reviews, trips] = await Promise.all([
    getRideOffers(supabase, user.id),
    getRecentReviews(supabase),
    getMyTrips(supabase, user.id),
  ]);
  // A server component renders once per request, so reading the time here is fine.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = trips.filter((t) => Date.parse(t.event.start_time) >= now);
  return <RidesView offers={offers} reviews={reviews} myTrips={upcoming} />;
}
