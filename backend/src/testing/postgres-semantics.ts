/**
 * Column semantics the in-memory fakes must share with Postgres, so a fake
 * cannot accept what the real database rejects (or keep what it normalizes).
 * Violations throw plain `Error`s; contracts assert "rejects" generically.
 */

export function requireNotNull<T>(
  value: T | null | undefined,
  column: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(`null value in column "${column}" violates not-null`);
  }
  return value;
}

export function requireVarchar(
  value: unknown,
  column: string,
  maxLength: number,
): string {
  const text = requireNotNull(value, column);
  if (typeof text !== 'string') {
    throw new Error(`invalid input for column "${column}"`);
  }
  if (text.length > maxLength) {
    throw new Error(
      `value too long for type character varying(${maxLength}) in column "${column}"`,
    );
  }
  return text;
}

/** `date` input: the time and zone of a datetime are discarded, like Postgres. */
export function requireDateOnly(value: unknown, column: string): string {
  const text = requireNotNull(value, column);
  const match =
    typeof text === 'string'
      ? /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text)
      : null;
  if (match) {
    const [, y, m, d] = match;
    const parsed = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (
      parsed.getUTCFullYear() === Number(y) &&
      parsed.getUTCMonth() === Number(m) - 1 &&
      parsed.getUTCDate() === Number(d)
    ) {
      return `${y}-${m}-${d}`;
    }
  }
  throw new Error(`invalid input syntax for type date in column "${column}"`);
}

/** `boolean` column: a real boolean (Postgres rejects other strings and numbers here). */
export function requireBoolean(value: unknown, column: string): boolean {
  const bool = requireNotNull(value, column);
  if (typeof bool !== 'boolean') {
    throw new Error(
      `invalid input syntax for type boolean in column "${column}"`,
    );
  }
  return bool;
}

/** Postgres enum column: only the declared labels are accepted. */
export function requireEnum<T extends string>(
  value: unknown,
  labels: readonly T[],
  column: string,
): T {
  const label = requireNotNull(value, column);
  if (!labels.includes(label as T)) {
    throw new Error(
      `invalid input value for enum in column "${column}": "${String(label)}"`,
    );
  }
  return label as T;
}

/** `integer` column: a 32-bit whole number. */
export function requireInt(value: unknown, column: string): number {
  const num = requireNotNull(value, column);
  if (typeof num !== 'number' || !Number.isInteger(num)) {
    throw new Error(
      `invalid input syntax for type integer in column "${column}"`,
    );
  }
  if (num > 2147483647 || num < -2147483648) {
    throw new Error(
      `value out of range for type integer in column "${column}"`,
    );
  }
  return num;
}

/** `timestamp` column (mode date): a valid `Date`, copied so callers cannot mutate rows. */
export function requireTimestamp(value: unknown, column: string): Date {
  const date = requireNotNull(value, column);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error(
      `invalid input syntax for type timestamp in column "${column}"`,
    );
  }
  return new Date(date.getTime());
}

/**
 * Postgres `LIKE`: case-sensitive, `%` and `_` are wildcards, `\` escapes the
 * next character. The pattern is matched against the whole value.
 */
export function likeMatch(value: string, pattern: string): boolean {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\' && i + 1 < pattern.length) {
      i += 1;
      source += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else if (char === '%') {
      source += '[\\s\\S]*';
    } else if (char === '_') {
      source += '[\\s\\S]';
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`).test(value);
}

/** Postgres `ILIKE`: `LIKE` that ignores case. */
export function ilikeMatch(value: string, pattern: string): boolean {
  return likeMatch(value.toLowerCase(), pattern.toLowerCase());
}

/**
 * `numeric(precision, scale)` column in string mode: the value is rounded half
 * away from zero to `scale` digits (exact decimal arithmetic, no float drift)
 * and must fit in `precision - scale` integer digits.
 */
export function requireNumeric(
  value: unknown,
  column: string,
  precision: number,
  scale: number,
): string {
  const input = requireNotNull(value, column);
  const match =
    typeof input === 'string' || typeof input === 'number'
      ? /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(String(input).trim())
      : null;
  if (!match) {
    throw new Error(`invalid input syntax for type numeric in "${column}"`);
  }
  const [, sign, whole, fraction = ''] = match;
  const digits = BigInt(whole + fraction.padEnd(scale, '0').slice(0, scale));
  const roundUp = (fraction[scale] ?? '0') >= '5';
  const scaled = digits + (roundUp ? 1n : 0n);
  if (scaled >= 10n ** BigInt(precision)) {
    throw new Error(`numeric field overflow in column "${column}"`);
  }
  const text = scaled.toString().padStart(scale + 1, '0');
  const integer = text.slice(0, text.length - scale);
  const decimals = text.slice(text.length - scale);
  const negative = sign === '-' && scaled !== 0n ? '-' : '';
  return `${negative}${integer}${scale > 0 ? `.${decimals}` : ''}`;
}

/** `uuid` column: a well-formed uuid, normalized to lower case like Postgres. */
export function requireUuid(value: unknown, column: string): string {
  const text = requireNotNull(value, column);
  if (
    typeof text !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      text,
    )
  ) {
    throw new Error(`invalid input syntax for type uuid in column "${column}"`);
  }
  return text.toLowerCase();
}
