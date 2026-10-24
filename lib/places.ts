// Campus pickup spots offered in the join form and used by the seed.
export const PICKUP_POINTS = {
  union: { name: "Oklahoma Memorial Union", lat: 35.2097, lng: -97.4446 },
  bizzell: { name: "Bizzell Memorial Library", lat: 35.2081, lng: -97.4458 },
  gaylord: { name: "Gaylord Hall", lat: 35.2056, lng: -97.4478 },
  headington: { name: "Headington Hall", lat: 35.2028, lng: -97.4438 },
} as const;

export type PickupKey = keyof typeof PICKUP_POINTS;

export function isPickupKey(value: string): value is PickupKey {
  return Object.hasOwn(PICKUP_POINTS, value);
}

export function pickupKeyByName(name: string | null): PickupKey | null {
  const entry = Object.entries(PICKUP_POINTS).find(([, p]) => p.name === name);
  return entry ? (entry[0] as PickupKey) : null;
}
