export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Approximate round trip for a ride: twice the straight line distance, one decimal.
export function roundTripMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.round(2 * haversineMiles(lat1, lng1, lat2, lng2) * 10) / 10;
}
