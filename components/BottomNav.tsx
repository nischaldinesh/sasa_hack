"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/events", label: "Events", icon: "🎟️" },
  { href: "/trips", label: "Trips", icon: "🚗" },
  { href: "/friends", label: "Friends", icon: "🤝" },
];

// usePathname is request data under Cache Components, so it must sit behind
// Suspense. The fallback is empty so the nav never flashes on the sign in page.
export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <Nav />
    </Suspense>
  );
}

function Nav() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-red-800 dark:text-red-400" : "text-zinc-500"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
