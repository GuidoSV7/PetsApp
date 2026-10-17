import { describe, expect, it } from 'vitest';
import { definedFields } from './update-patch.util.js';

describe('definedFields', () => {
  it('drops undefined values and keeps the rest', () => {
    expect(definedFields({ a: 1, b: undefined, c: 'x' })).toEqual({
      a: 1,
      c: 'x',
    });
  });

  it('keeps null, false, 0 and empty strings (they are real values)', () => {
    expect(definedFields({ a: null, b: false, c: 0, d: '' })).toEqual({
      a: null,
      b: false,
      c: 0,
      d: '',
    });
  });

  it('returns an empty object for an empty or all-undefined patch', () => {
    expect(definedFields({})).toEqual({});
    expect(definedFields({ a: undefined })).toEqual({});
  });

  it('keeps only the allowed keys when a whitelist is given', () => {
    expect(definedFields({ a: 1, bogus: 2, c: undefined }, ['a', 'c'])).toEqual(
      { a: 1 },
    );
    expect(definedFields({ bogus: 2 }, ['a'])).toEqual({});
  });

  it('does not mutate the input', () => {
    const patch = { a: undefined, b: 1 };
    definedFields(patch);
    expect(patch).toEqual({ a: undefined, b: 1 });
  });
});
