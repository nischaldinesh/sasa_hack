import { haversineMiles } from "./geo";

// Route based rider matching. A driver's route runs from their starting
// location to the event; riders are matched when picking them up adds at most
// MAX_DETOUR_MILES. Routes are straight line estimates (no routing API).

export type Point = { lat: number; lng: number };

// Configurable with NEXT_PUBLIC_MAX_DETOUR_MILES (default 2 miles).
export const MAX_DETOUR_MILES = (() => {
  const v = Number(process.env.NEXT_PUBLIC_MAX_DETOUR_MILES);
  return Number.isFinite(v) && v > 0 ? v : 2;
})();

// Average speed used to turn extra miles into extra minutes.
export const DETOUR_MPH = 30;

const dist = (a: Point, b: Point) => haversineMiles(a.lat, a.lng, b.lat, b.lng);

// Extra miles to go start -> pickup -> end instead of start -> end.
export function detourMiles(start: Point, pickup: Point, end: Point): number {
  return Math.max(0, dist(start, pickup) + dist(pickup, end) - dist(start, end));
}

export function detourMinutes(miles: number, mph = DETOUR_MPH): number {
  return Math.round((miles / mph) * 60);
}

// How far along the start -> end line a point sits (0 = start, 1 = end),
// using a local flat projection. Used to order pickups along the route.
export function progressAlong(start: Point, point: Point, end: Point): number {
  const k = Math.cos((start.lat * Math.PI) / 180);
  const ex = (end.lng - start.lng) * k;
  const ey = end.lat - start.lat;
  const len2 = ex * ex + ey * ey;
  if (len2 === 0) return 0;
  const t = (((point.lng - start.lng) * k) * ex + (point.lat - start.lat) * ey) / len2;
  return Math.min(1, Math.max(0, t));
}

export function isOnRoute(start: Point, pickup: Point, end: Point, maxDetour = MAX_DETOUR_MILES): boolean {
  return detourMiles(start, pickup, end) <= maxDetour + 1e-9;
}

export type RouteCandidate<T> = T & { detourMiles: number; detourMinutes: number; progress: number };

// Riders whose pickup adds at most maxDetour, smallest detour first; ties go
// to the pickup that comes earlier along the route.
export function rankRouteRiders<T extends { pickup: Point }>(
  start: Point,
  end: Point,
  riders: T[],
  maxDetour = MAX_DETOUR_MILES,
): RouteCandidate<T>[] {
  return riders
    .map((r) => {
      const d = detourMiles(start, r.pickup, end);
      return { ...r, detourMiles: d, detourMinutes: detourMinutes(d), progress: progressAlong(start, r.pickup, end) };
    })
    .filter((r) => r.detourMiles <= maxDetour + 1e-9)
    .sort((a, b) => a.detourMiles - b.detourMiles || a.progress - b.progress);
}

export type RoutePlan<T> = {
  stops: T[]; // pickups in driving order
  totalMiles: number; // start -> stops -> end
  directMiles: number; // start -> end
  extraMiles: number;
  extraMinutes: number;
};

function pathMiles(start: Point, stops: { pickup: Point }[], end: Point): number {
  let total = 0;
  let at = start;
  for (const s of stops) {
    total += dist(at, s.pickup);
    at = s.pickup;
  }
  return total + dist(at, end);
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

// Orders pickups for the shortest drive and measures the whole trip. A car
// holds at most 7 riders, so every order is tried (exact); longer lists fall
// back to the order along the route.
export function planRoute<T extends { pickup: Point }>(start: Point, end: Point, stops: T[]): RoutePlan<T> {
  const byProgress = [...stops].sort((a, b) => progressAlong(start, a.pickup, end) - progressAlong(start, b.pickup, end));
  let ordered = byProgress;
  if (stops.length > 1 && stops.length <= 7) {
    let best = pathMiles(start, byProgress, end);
    for (const order of permutations(byProgress)) {
      const miles = pathMiles(start, order, end);
      if (miles < best - 1e-9) {
        best = miles;
        ordered = order;
      }
    }
  }
  const total = pathMiles(start, ordered, end);
  const direct = dist(start, end);
  const extra = Math.max(0, total - direct);
  return { stops: ordered, totalMiles: total, directMiles: direct, extraMiles: extra, extraMinutes: detourMinutes(extra) };
}

export function formatDetour(miles: number): string {
  if (miles < 0.1) return "on your way";
  return `+${miles.toFixed(1)} mi · ~${detourMinutes(miles)} min`;
}
