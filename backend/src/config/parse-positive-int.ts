/**
 * Parses an env-style value into a positive integer.
 * Returns `fallback` for missing, blank, non-numeric, non-integer or <= 0 values.
 */
export function parsePositiveInt(value: unknown, fallback: number): number {
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return fallback;
    parsed = Number(trimmed);
  } else {
    return fallback;
  }
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
