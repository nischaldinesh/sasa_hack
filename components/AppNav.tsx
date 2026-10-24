"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { CardsIcon, CarIcon, FriendsIcon, ListIcon, UserIcon } from "@/components/Icons";
import { AvatarLink, BellLink, useNavInfo } from "@/components/NavInfo";
import { recordNavigation } from "@/lib/navHistory";

const TABS = [
  { href: "/discover", label: "Discover", Icon: CardsIcon },
  { href: "/events", label: "Events", Icon: ListIcon },
  { href: "/rides", label: "Rides", Icon: CarIcon },
  { href: "/friends", label: "Friends", Icon: FriendsIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

// Only these exact paths show the bottom tabs on mobile. Pages under them
// (an event's How are you going, people deck, registered; trip cards) have
// their own back button and bottom actions, which the tabs would cover.
const MAIN = ["/discover", "/events", "/rides", "/friends", "/profile", "/matches"];
// "You're registered!" keeps the tabs so people can hop back to Discover.
const WITH_TABS = /^\/events\/[^/]+\/registered$/;

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

// usePathname is request data under Cache Components, so it must sit behind
// Suspense. The fallback is empty so the nav never flashes on the sign in page.
export default function AppNav() {
  return (
    <Suspense fallback={null}>
      <Nav />
    </Suspense>
  );
}

function Nav() {
  const pathname = usePathname();
  const info = useNavInfo();
  useEffect(() => recordNavigation(), [pathname]);
  if (pathname === "/") return null;

  return (
    <>
      {/* Desktop: top navbar */}
      <header className="sticky top-0 z-30 hidden border-b border-zinc-200 bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-6 px-6">
          <Link href="/discover" className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-lg font-extrabold tracking-tight">SoonerSwipe</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {TABS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  isActive(pathname, href) ? "bg-crimson-soft text-crimson" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <BellLink unseen={info?.unseenMatches ?? 0} />
          <AvatarLink name={info?.name ?? null} />
        </div>
      </header>

      {/* Mobile: bottom tabs on main screens */}
      {(MAIN.includes(pathname) || WITH_TABS.test(pathname)) && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          <ul className="grid grid-cols-5">
            {TABS.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                      active ? "text-crimson" : "text-zinc-400"
                    }`}
                  >
                    <Icon className="text-2xl" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
