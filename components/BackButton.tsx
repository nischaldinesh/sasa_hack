"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/Icons";
import { hasInAppHistory } from "@/lib/navHistory";

// Goes back to wherever the user came from (Discover, Events, a match…), or
// to `fallback` when the page was opened directly.
export default function BackButton({ fallback, label = "Back" }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => (hasInAppHistory() ? router.back() : router.push(fallback))}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-2xl text-zinc-600"
    >
      <ChevronLeftIcon />
    </button>
  );
}
