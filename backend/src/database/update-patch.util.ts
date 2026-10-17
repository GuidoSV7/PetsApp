/**
 * Drops `undefined` entries from a partial patch, and (when `allowedKeys` is
 * given) keys that are not columns. `null` and falsy values are kept (they are
 * real values). Repositories use it to build `UPDATE ... SET` payloads and to
 * detect an empty patch, which must never reach SQL (`update ... set  where`
 * is a syntax error).
 */
export function definedFields<T extends object>(
  patch: T,
  allowedKeys?: readonly string[],
): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(
      ([key, value]) =>
        value !== undefined && (!allowedKeys || allowedKeys.includes(key)),
    ),
  ) as Partial<T>;
}
