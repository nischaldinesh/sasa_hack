// Campus pickup spots offered in the pickup picker and used by the seed.
export const PICKUP_POINTS = {
  union: { name: "Oklahoma Memorial Union", lat: 35.2097, lng: -97.4446 },
  bizzell: { name: "Bizzell Library", lat: 35.2081, lng: -97.4458 },
  adams: { name: "Adams Hall", lat: 35.2067, lng: -97.4434 },
  couch: { name: "Couch Tower", lat: 35.2017, lng: -97.4427 },
  headington: { name: "Headington Hall", lat: 35.2028, lng: -97.4438 },
  gaylord: { name: "Gaylord Hall", lat: 35.2056, lng: -97.4478 },
  sarkeys: { name: "Sarkeys Energy Center", lat: 35.2099, lng: -97.4407 },
  cross: { name: "Cross Village", lat: 35.2003, lng: -97.4389 },
} as const;

export type PickupKey = keyof typeof PICKUP_POINTS;

// Distances "from campus" are measured from the Union.
export const CAMPUS = PICKUP_POINTS.union;

export function isPickupKey(value: string): value is PickupKey {
  return Object.hasOwn(PICKUP_POINTS, value);
}

export function pickupKeyByName(name: string | null): PickupKey | null {
  const entry = Object.entries(PICKUP_POINTS).find(([, p]) => p.name === name);
  return entry ? (entry[0] as PickupKey) : null;
}

// Case insensitive substring search over pickup spot names.
export function searchPickups(query: string): PickupKey[] {
  const q = query.trim().toLowerCase();
  return (Object.keys(PICKUP_POINTS) as PickupKey[]).filter((key) =>
    PICKUP_POINTS[key].name.toLowerCase().includes(q),
  );
}
