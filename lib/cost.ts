// Per-person gas share. The driver counts as one of the people splitting.
export function costShare(
  miles: number,
  mpg: number,
  gasPrice: number,
  usageRate: number,
  riders: number,
): number {
  if (miles <= 0 || mpg <= 0 || riders < 0) throw new Error("invalid input");
  const total = (miles / mpg) * gasPrice + miles * usageRate;
  return Math.round((total / (riders + 1)) * 100) / 100;
}

export type CostBreakdown = {
  fuel: number; // miles / mpg * gas price, rounded to the cent
  usage: number; // miles * usage rate, rounded to the cent
  total: number; // fuel + usage, rounded to the cent
  people: number; // driver + riders
  each: number; // costShare(...)
};

// Lines for the trip card's gas split. `each` is costShare, so it matches S3.
export function costBreakdown(
  miles: number,
  mpg: number,
  gasPrice: number,
  usageRate: number,
  riders: number,
): CostBreakdown {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const fuel = (miles / mpg) * gasPrice;
  const usage = miles * usageRate;
  return {
    fuel: cents(fuel),
    usage: cents(usage),
    total: cents(fuel + usage),
    people: riders + 1,
    each: costShare(miles, mpg, gasPrice, usageRate, riders),
  };
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
