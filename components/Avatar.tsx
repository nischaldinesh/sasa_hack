import { avatarColor, initials } from "@/lib/names";

const SIZES = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-lg",
  xl: "h-28 w-28 text-4xl",
};

export default function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${avatarColor(name)} ${SIZES[size]} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
