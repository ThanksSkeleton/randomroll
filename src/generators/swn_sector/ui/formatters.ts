/** Format an AU distance with at most three significant digits. */
export function formatAu(au: number): string {
  if (!Number.isFinite(au)) return String(au);
  return String(Number(au.toPrecision(3)));
}
