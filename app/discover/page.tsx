import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DiscoverDeck from "@/components/DiscoverDeck";
import DemoResetButton from "@/components/DemoResetButton";
import { isSeededEmail } from "@/lib/demoData";
import { createClient } from "@/lib/supabase/server";
import { getEventSummaries } from "@/lib/queries";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] pb-24 md:px-6 md:py-8">
      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverData />
      </Suspense>
    </main>
  );
}

async function DiscoverData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [events, { data: profile }] = await Promise.all([
    getEventSummaries(supabase, user.id),
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
  ]);
  return (
    <>
      <DiscoverDeck events={events} />
      <DemoResetButton name={profile?.name ?? user.email!} seeded={isSeededEmail(user.email)} />
    </>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 pt-20" aria-busy>
      <div className="h-[60dvh] max-h-[620px] min-h-[440px] w-full max-w-[420px] animate-pulse rounded-[28px] bg-zinc-200" />
      <p className="text-sm text-zinc-500">Loading events…</p>
    </div>
  );
}
