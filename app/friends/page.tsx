import Link from "next/link";

export default function FriendsPage() {
  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-red-800 dark:text-red-500">Friends</h1>
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="font-semibold">No friends yet.</p>
        <p className="text-sm text-zinc-500">After a shared ride, add your trip mates as friends from the trip card.</p>
        <Link href="/events" className="h-12 rounded-full bg-red-800 px-6 font-semibold leading-[3rem] text-white">
          Browse events
        </Link>
      </div>
    </main>
  );
}
