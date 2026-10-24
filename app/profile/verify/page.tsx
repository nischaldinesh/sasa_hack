import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DriverVerify from "@/components/DriverVerify";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verify to drive" };

export default function VerifyPage({ searchParams }: PageProps<"/profile/verify">) {
  return (
    <main className="mx-auto w-full max-w-lg px-6 pb-10 pt-6 md:py-10">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading…</p>}>
        <Verify searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Verify({ searchParams }: { searchParams: PageProps<"/profile/verify">["searchParams"] }) {
  const { next } = await searchParams;
  // Only same-site paths, so the link can't send drivers off site.
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("license_plate, license_verified_at").eq("id", user.id).maybeSingle();
  return <DriverVerify next={target} verifiedPlate={profile?.license_verified_at ? profile.license_plate : null} />;
}
