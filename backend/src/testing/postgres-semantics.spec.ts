import { describe, expect, it } from 'vitest';
import {
  ilikeMatch,
  likeMatch,
  requireBoolean,
  requireDateOnly,
  requireEnum,
  requireInt,
  requireNumeric,
  requireUuid,
  requireNotNull,
  requireTimestamp,
  requireVarchar,
} from './postgres-semantics.js';

describe('postgres semantics for fakes', () => {
  it('requireNotNull rejects null and undefined, keeps falsy values', () => {
    expect(() => requireNotNull(null, 'c')).toThrow(/not-null/);
    expect(() => requireNotNull(undefined, 'c')).toThrow(/not-null/);
    expect(requireNotNull(0, 'c')).toBe(0);
  });

  it('requireVarchar accepts max length and rejects longer or non-strings', () => {
    expect(requireVarchar('abc', 'c', 3)).toBe('abc');
    expect(() => requireVarchar('abcd', 'c', 3)).toThrow(/too long/);
    expect(() => requireVarchar(5, 'c', 3)).toThrow();
    expect(() => requireVarchar(null, 'c', 3)).toThrow(/not-null/);
  });

  it('requireDateOnly truncates datetimes and rejects invalid dates', () => {
    expect(requireDateOnly('2030-06-15', 'c')).toBe('2030-06-15');
    expect(requireDateOnly('2030-06-15T23:00:00Z', 'c')).toBe('2030-06-15');
    expect(requireDateOnly('2030-06-15 23:00:00+05', 'c')).toBe('2030-06-15');
    expect(() => requireDateOnly('2030-02-31', 'c')).toThrow(/date/);
    expect(() => requireDateOnly('nope', 'c')).toThrow(/date/);
    expect(() => requireDateOnly(null, 'c')).toThrow(/not-null/);
  });

  it('requireBoolean accepts booleans only and rejects null', () => {
    expect(requireBoolean(true, 'c')).toBe(true);
    expect(requireBoolean(false, 'c')).toBe(false);
    expect(() => requireBoolean('maybe', 'c')).toThrow(/boolean/);
    expect(() => requireBoolean(1, 'c')).toThrow(/boolean/);
    expect(() => requireBoolean(null, 'c')).toThrow(/not-null/);
  });

  it('requireEnum accepts only declared labels', () => {
    expect(requireEnum('a', ['a', 'b'], 'c')).toBe('a');
    expect(() => requireEnum('z', ['a', 'b'], 'c')).toThrow(/enum/);
    expect(() => requireEnum('', ['a', 'b'], 'c')).toThrow(/enum/);
    expect(() => requireEnum(null, ['a', 'b'], 'c')).toThrow(/not-null/);
  });

  it('requireInt accepts 32-bit integers only', () => {
    expect(requireInt(0, 'c')).toBe(0);
    expect(requireInt(2147483647, 'c')).toBe(2147483647);
    expect(() => requireInt(2147483648, 'c')).toThrow(/out of range/);
    expect(() => requireInt(1.5, 'c')).toThrow();
    expect(() => requireInt('5', 'c')).toThrow();
    expect(() => requireInt(null, 'c')).toThrow(/not-null/);
  });

  it('requireTimestamp accepts valid Dates and rejects the rest', () => {
    const date = new Date('2030-01-01T00:00:00Z');
    expect(requireTimestamp(date, 'c')).toEqual(date);
    expect(requireTimestamp(date, 'c')).not.toBe(date);
    expect(() => requireTimestamp(new Date('nope'), 'c')).toThrow(/timestamp/);
    expect(() => requireTimestamp('2030-01-01', 'c')).toThrow(/timestamp/);
    expect(() => requireTimestamp(null, 'c')).toThrow(/not-null/);
  });

  it('likeMatch is case-sensitive and honors % and _ wildcards and escapes', () => {
    expect(likeMatch('Summer Sale', '%Summer%')).toBe(true);
    expect(likeMatch('summer', '%Summer%')).toBe(false);
    expect(likeMatch('plain', '%p_ain%')).toBe(true);
    expect(likeMatch('50% off', '%\\%%')).toBe(true);
    expect(likeMatch('abc', '%\\%%')).toBe(false);
    expect(likeMatch('a.c', 'a.c')).toBe(true);
    expect(likeMatch('abc', 'a.c')).toBe(false);
    expect(likeMatch('a\nb', '%b')).toBe(true);
  });

  it('requireNumeric rounds half away from zero to the scale and checks the precision', () => {
    expect(requireNumeric('20', 'c', 5, 2)).toBe('20.00');
    expect(requireNumeric('12.345', 'c', 5, 2)).toBe('12.35');
    expect(requireNumeric('12.344', 'c', 5, 2)).toBe('12.34');
    expect(requireNumeric('-12.345', 'c', 5, 2)).toBe('-12.35');
    expect(requireNumeric(7.5, 'c', 5, 2)).toBe('7.50');
    expect(requireNumeric('999.99', 'c', 5, 2)).toBe('999.99');
  });

  it('requireNumeric rejects overflow, junk and null', () => {
    expect(() => requireNumeric('1000', 'c', 5, 2)).toThrow(/overflow/);
    expect(() => requireNumeric('999.995', 'c', 5, 2)).toThrow(/overflow/);
    expect(() => requireNumeric('abc', 'c', 5, 2)).toThrow(/numeric/);
    expect(() => requireNumeric('', 'c', 5, 2)).toThrow(/numeric/);
    expect(() => requireNumeric(null, 'c', 5, 2)).toThrow(/not-null/);
  });

  it('requireUuid accepts well-formed uuids only', () => {
    const id = '99999999-9999-4999-8999-999999999999';
    expect(requireUuid(id, 'c')).toBe(id);
    expect(requireUuid(id.toUpperCase(), 'c')).toBe(id);
    expect(() => requireUuid('nope', 'c')).toThrow(/uuid/);
    expect(() => requireUuid(5, 'c')).toThrow(/uuid/);
    expect(() => requireUuid(null, 'c')).toThrow(/not-null/);
  });
});

describe('ilikeMatch', () => {
  it('matches case-insensitively with LIKE wildcards', () => {
    expect(ilikeMatch('Golden Retriever', '%golden%')).toBe(true);
    expect(ilikeMatch('A_B', 'a_b')).toBe(true);
    expect(ilikeMatch('AB-1', 'a_b')).toBe(false);
  });

  it('matches the whole value and keeps backslash escapes', () => {
    expect(ilikeMatch('Golden', 'den')).toBe(false);
    expect(ilikeMatch('50%', '50\\%')).toBe(true);
    expect(ilikeMatch('500', '50\\%')).toBe(false);
  });
});
