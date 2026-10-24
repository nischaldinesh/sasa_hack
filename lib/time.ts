// All event and departure times are entered and shown in Norman's time zone,
// independent of the server's or browser's zone.
export const TIME_ZONE = "America/Chicago";

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function partsInZone(ms: number): Parts {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormatter.formatToParts(ms)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute };
}

// Minutes the zone is ahead of UTC at the given instant (-300 for CDT, -360 for CST).
function offsetMinutes(ms: number): number {
  const floored = Math.floor(ms / 60000) * 60000;
  const p = partsInZone(floored);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - floored) / 60000;
}

// Converts a wall clock time in America/Chicago to a UTC instant.
// month is 1-12; day may overflow (e.g. day 35) and rolls into the next month.
export function chicagoToUtc(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const guess = localAsUtc - offsetMinutes(localAsUtc) * 60000;
  return new Date(localAsUtc - offsetMinutes(guess) * 60000);
}

// Today's calendar date in America/Chicago.
export function chicagoToday(now: Date = new Date()): { year: number; month: number; day: number } {
  const { year, month, day } = partsInZone(now.getTime());
  return { year, month, day };
}

// Parses a <input type="datetime-local"> value ("2026-11-02T09:30") as Chicago time.
export function parseChicagoInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return chicagoToUtc(year, month, day, hour, minute);
}

// Formats an instant as a datetime-local value in Chicago time.
export function toChicagoInput(iso: string): string {
  const p = partsInZone(new Date(iso).getTime());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

const displayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// "Fri, Oct 30, 10:00 AM"
export function formatEventTime(iso: string): string {
  return displayFormatter.format(new Date(iso));
}
