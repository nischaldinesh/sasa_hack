"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon } from "@/components/Icons";
import Avatar from "@/components/Avatar";

type NavInfo = { name: string; unseenMatches: number };

// Name and unseen match count for the navbar, refreshed on every navigation.
export function useNavInfo(): NavInfo | null {
  const pathname = usePathname();
  const [info, setInfo] = useState<NavInfo | null>(null);

  useEffect(() => {
    if (pathname === "/") return; // signed out on the sign in page
    let active = true;
    const load = () =>
      fetch("/api/nav", { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<NavInfo>) : null))
        .then((data) => {
          if (active && data) setInfo(data);
        })
        .catch(() => {});
    load();
    // Pages that change the nav state (e.g. /matches marking matches seen) fire this.
    window.addEventListener("nav:refresh", load);
    return () => {
      active = false;
      window.removeEventListener("nav:refresh", load);
    };
  }, [pathname]);

  return info;
}

export function BellLink({ unseen }: { unseen: number }) {
  return (
    <Link
      href="/matches"
      aria-label={unseen > 0 ? `${unseen} new notifications` : "Notifications"}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-2xl text-zinc-600 hover:bg-zinc-100"
    >
      <BellIcon />
      {unseen > 0 && <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full bg-crimson ring-2 ring-white" />}
    </Link>
  );
}

export function AvatarLink({ name }: { name: string | null }) {
  return (
    <Link href="/profile" aria-label="Profile" className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
      {name && <Avatar name={name} className="h-11 w-11" />}
    </Link>
  );
}

// Bell + avatar pair used in page headers on mobile.
export function HeaderActions() {
  const info = useNavInfo();
  return (
    <div className="flex items-center gap-2">
      <BellLink unseen={info?.unseenMatches ?? 0} />
      <AvatarLink name={info?.name ?? null} />
    </div>
  );
}
