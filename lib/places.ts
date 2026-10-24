// Pickup spots offered in the pickup picker and used by the seed: on campus,
// student housing (on and off campus) and well known places around Norman.
// Coordinates are approximate (within a few hundred feet); verify names and
// pins before relying on them for real pickups.
export type PickupArea = "campus" | "housing" | "norman";

type Place = { name: string; lat: number; lng: number; area: PickupArea };

export const PICKUP_POINTS = {
  // On campus
  union: { name: "Oklahoma Memorial Union", lat: 35.2097, lng: -97.4446, area: "campus" },
  bizzell: { name: "Bizzell Library", lat: 35.2081, lng: -97.4458, area: "campus" },
  adams: { name: "Adams Hall", lat: 35.2067, lng: -97.4434, area: "campus" },
  gaylord: { name: "Gaylord Hall", lat: 35.2056, lng: -97.4478, area: "campus" },
  sarkeys: { name: "Sarkeys Energy Center", lat: 35.2099, lng: -97.4407, area: "campus" },
  dale: { name: "Dale Hall", lat: 35.2049, lng: -97.4461, area: "campus" },
  devon: { name: "Devon Energy Hall", lat: 35.2104, lng: -97.442, area: "campus" },
  catlett: { name: "Catlett Music Center", lat: 35.2083, lng: -97.4469, area: "campus" },
  stadium: { name: "Gaylord Family–OU Memorial Stadium", lat: 35.2059, lng: -97.4423, area: "campus" },
  lnc: { name: "Lloyd Noble Center", lat: 35.1868, lng: -97.4433, area: "campus" },

  // Student housing
  couch: { name: "Couch Tower", lat: 35.2017, lng: -97.4427, area: "housing" },
  headington: { name: "Headington Hall", lat: 35.2028, lng: -97.4438, area: "housing" },
  walker: { name: "Walker Center", lat: 35.2015, lng: -97.445, area: "housing" },
  dunham: { name: "Dunham College", lat: 35.2034, lng: -97.4428, area: "housing" },
  cross: { name: "Cross Village", lat: 35.2003, lng: -97.4389, area: "housing" },
  kraettli: { name: "Kraettli Apartments", lat: 35.1985, lng: -97.4459, area: "housing" },
  traditions: { name: "Traditions Square Apartments", lat: 35.1965, lng: -97.4435, area: "housing" },
  callaway: { name: "Callaway House", lat: 35.198, lng: -97.4415, area: "housing" },
  crimsonpark: { name: "Crimson Park Apartments", lat: 35.1938, lng: -97.4398, area: "housing" },
  jenkins: { name: "Jenkins Ave & Lindsey St", lat: 35.2007, lng: -97.441, area: "housing" },
  classen: { name: "Classen Blvd & Lindsey St", lat: 35.2005, lng: -97.433, area: "housing" },
  imhoff: { name: "Imhoff Rd & Classen Blvd", lat: 35.189, lng: -97.433, area: "housing" },
  westlindsey: { name: "24th Ave SW & Lindsey St", lat: 35.2005, lng: -97.472, area: "housing" },

  // Around Norman
  campuscorner: { name: "Campus Corner", lat: 35.211, lng: -97.444, area: "norman" },
  mainst: { name: "Downtown Norman (Main St)", lat: 35.2215, lng: -97.4418, area: "norman" },
  depot: { name: "Norman Depot", lat: 35.2208, lng: -97.4433, area: "norman" },
  andrews: { name: "Andrews Park", lat: 35.2232, lng: -97.4447, area: "norman" },
  reaves: { name: "Reaves Park", lat: 35.199, lng: -97.432, area: "norman" },
  soonermall: { name: "Sooner Mall", lat: 35.218, lng: -97.49, area: "norman" },
  unp: { name: "University North Park", lat: 35.2465, lng: -97.4895, area: "norman" },
  brookhaven: { name: "Brookhaven Village", lat: 35.237, lng: -97.488, area: "norman" },
  hospital: { name: "Norman Regional Hospital", lat: 35.2286, lng: -97.4316, area: "norman" },
} as const satisfies Record<string, Place>;

export type PickupKey = keyof typeof PICKUP_POINTS;

export const AREA_LABELS: Record<PickupArea, string> = {
  campus: "On campus",
  housing: "Student housing",
  norman: "Around Norman",
};

// Distances "from campus" are measured from the Union.
export const CAMPUS = PICKUP_POINTS.union;

export function isPickupKey(value: string): value is PickupKey {
  return Object.hasOwn(PICKUP_POINTS, value);
}

export function pickupKeyByName(name: string | null): PickupKey | null {
  const entry = Object.entries(PICKUP_POINTS).find(([, p]) => p.name === name);
  return entry ? (entry[0] as PickupKey) : null;
}

// Case insensitive search over pickup spot names and their area label.
export function searchPickups(query: string): PickupKey[] {
  const q = query.trim().toLowerCase();
  return (Object.keys(PICKUP_POINTS) as PickupKey[]).filter((key) => {
    const p = PICKUP_POINTS[key];
    return p.name.toLowerCase().includes(q) || AREA_LABELS[p.area].toLowerCase().includes(q);
  });
}
