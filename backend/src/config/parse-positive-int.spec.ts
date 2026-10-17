import { describe, expect, it } from 'vitest';
import { parsePositiveInt } from './parse-positive-int.js';

describe('parsePositiveInt', () => {
  it.each<[unknown, number]>([
    [undefined, 7],
    [null, 7],
    ['', 7],
    ['   ', 7],
    ['abc', 7],
    ['NaN', 7],
    ['1.5', 7],
    ['0', 7],
    ['-3', 7],
    [0, 7],
    [-1, 7],
    [2.5, 7],
    [Number.NaN, 7],
    [Infinity, 7],
    [{}, 7],
    ['3', 3],
    [' 12 ', 12],
    [4, 4],
  ])('parsePositiveInt(%j, 7) -> %d', (value, expected) => {
    expect(parsePositiveInt(value, 7)).toBe(expected);
  });
});
