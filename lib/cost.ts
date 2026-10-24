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
