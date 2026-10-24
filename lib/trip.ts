import { haversineMiles } from "./geo";

export type Stop = { name: string | null; lat: number | null; lng: number | null };

// Pickup order: the driver's pickup first, then riders by distance from it.
// Riders at the same spot share a stop.
export function orderStops(driver: Stop, riders: Stop[]): string[] {
  const named = riders.filter((r): r is { name: string; lat: number | null; lng: number | null } => !!r.name);
  const dist = (r: Stop) =>
    driver.lat != null && driver.lng != null && r.lat != null && r.lng != null
      ? haversineMiles(driver.lat, driver.lng, r.lat, r.lng)
      : Number.POSITIVE_INFINITY;
  const ordered = [...named].sort((a, b) => dist(a) - dist(b)).map((r) => r.name);
  const stops = driver.name ? [driver.name, ...ordered] : ordered;
  return stops.filter((name, i) => stops.indexOf(name) === i);
}

export const AVERAGE_MPH = 45;

// Estimated arrival: departure plus one way miles at an average 45 mph.
export function arrivalEstimate(departIso: string, oneWayMiles: number, mph = AVERAGE_MPH): string {
  return new Date(Date.parse(departIso) + (oneWayMiles / mph) * 60 * 60 * 1000).toISOString();
}

// "Oklahoma City" -> "OKC" for tight spots in the UI.
const SHORT_CITIES: Record<string, string> = { "Oklahoma City": "OKC" };
export function shortCity(city: string | null): string | null {
  return city ? (SHORT_CITIES[city] ?? city) : null;
}

// Drop off has happened once the estimated arrival (or, without one, the event
// start) is in the past. Riders are asked for a review from then on.
export function isDroppedOff(arrivalIso: string | null, eventStartIso: string, now: number = Date.now()): boolean {
  return now >= Date.parse(arrivalIso ?? eventStartIso);
}
