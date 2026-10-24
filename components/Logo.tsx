import { CarIcon } from "@/components/Icons";

// Crimson app tile with the car mark.
export default function Logo({ size = "md" }: { size?: "sm" | "md" | "xl" }) {
  const box = { sm: "h-9 w-9 rounded-xl text-lg", md: "h-11 w-11 rounded-2xl text-2xl", xl: "h-24 w-24 rounded-[28px] text-5xl" }[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-crimson text-white shadow-lg shadow-crimson/25 ${box}`}
      aria-hidden
    >
      <CarIcon />
    </span>
  );
}
