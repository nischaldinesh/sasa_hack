// "Priya Krishnamurthy" -> "PK"
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// "Priya Krishnamurthy" -> "Priya K."
export function shortName(name: string): string {
  const [first, ...rest] = name.split(/\s+/).filter(Boolean);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : (first ?? "");
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

// Soft avatar colors, picked from the name so a person keeps their color.
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
