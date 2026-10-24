import { avatarUri } from "@/lib/avatar";

const SIZES = {
  xs: "h-7 w-7",
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
  xl: "h-28 w-28",
};

// DiceBear illustrated avatar. `name` seeds the picture so a person looks the
// same everywhere in the app.
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
    // eslint-disable-next-line @next/next/no-img-element -- inline data URI, nothing to optimize
    <img src={avatarUri(name)} alt="" aria-hidden className={`shrink-0 rounded-full bg-zinc-100 object-cover ${SIZES[size]} ${className}`} />
  );
}
