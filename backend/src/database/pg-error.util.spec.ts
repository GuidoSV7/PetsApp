import { describe, expect, it } from 'vitest';
import { pgErrorCode } from './pg-error.util.js';

describe('pgErrorCode', () => {
  it('reads code from a raw driver error', () => {
    expect(pgErrorCode({ code: '23505' })).toBe('23505');
  });

  it('reads code from the cause of a wrapped Drizzle error', () => {
    expect(
      pgErrorCode({ message: 'Failed query', cause: { code: '23503' } }),
    ).toBe('23503');
  });

  it('prefers the top-level code over the cause', () => {
    expect(pgErrorCode({ code: '23505', cause: { code: '23503' } })).toBe(
      '23505',
    );
  });

  it.each([[undefined], [null], [new Error('x')], ['str']])(
    'returns undefined for %s',
    (value) => {
      expect(pgErrorCode(value)).toBeUndefined();
    },
  );
});
