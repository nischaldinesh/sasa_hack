import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import ProfileForm from "@/components/ProfileForm";
import { signOut } from "@/app/events/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyTrips } from "@/lib/queries";
import { formatEventTime } from "@/lib/time";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 pb-24 pt-5 md:px-6 md:py-8">
      <Suspense fallback={<p className="p-10 text-center text-zinc-500">Loading profile…</p>}>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Profile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile, error }, trips] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, email, major, year, bio, orgs, car_model, mpg, license_plate, license_verified_at")
      .eq("id", user.id)
      .maybeSingle(),
    getMyTrips(supabase, user.id),
  ]);
  if (error) throw new Error(error.message);
  const name = profile?.name ?? user.email ?? "Sooner";

  return (
    <>
      <header className="flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black tracking-tight">{name}</h1>
          <p className="truncate text-zinc-500">{profile?.email ?? user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="rounded-2xl bg-zinc-100 px-4 py-2.5 font-semibold text-zinc-700">
            Sign out
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_380px] md:items-start">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <h2 className="mb-4 text-lg font-black">Edit profile</h2>
          <ProfileForm
            initial={{
              name,
              major: profile?.major ?? null,
              year: profile?.year ?? null,
              bio: profile?.bio ?? null,
              orgs: profile?.orgs ?? [],
              carModel: profile?.car_model ?? null,
              mpg: profile?.mpg ?? null,
            }}
          />
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            <h2 className="mb-2 text-lg font-black">Driver verification</h2>
            {profile?.license_verified_at ? (
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-green-600">✓ Verified driver</p>
                <span className="rounded-xl bg-zinc-900 px-3 py-1 font-mono font-bold tracking-widest text-white">
                  {profile.license_plate}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">Add your plate and license to offer rides.</p>
                <Link
                  href="/profile/verify"
                  className="shrink-0 rounded-xl bg-crimson px-4 py-2.5 font-bold text-white"
                >
                  Verify
                </Link>
              </div>
            )}
          </section>

          <section id="trips" className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            <h2 className="mb-3 text-lg font-black">My trips</h2>
            {trips.length === 0 ? (
              <div className="flex flex-col items-start gap-3 text-zinc-500">
                <p>No trips yet. Join an event and match with a driver or rider to start one.</p>
                <Link href="/discover" className="rounded-2xl bg-crimson px-5 py-2.5 font-bold text-white">
                  Discover events
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-zinc-100">
                {trips.map((t) => (
                  <li key={t.id}>
                    <Link href={`/trips/${t.id}`} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{t.event.title}</p>
                        <p className="truncate text-sm text-zinc-500">
                          {formatEventTime(t.event.start_time)} ·{" "}
                          {t.myRole === "driver" ? "You're driving" : `With ${t.driverName}`} · {t.riderCount}
                          {t.seats ? `/${t.seats}` : ""} riders
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-xl px-3 py-1 text-sm font-semibold ${
                          t.myRole === "driver" ? "bg-crimson-soft text-crimson" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {t.myRole === "driver" ? "Driver" : "Rider"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
