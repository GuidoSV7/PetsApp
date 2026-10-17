import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CONFLICT_MESSAGE, asConflict, retryable } from './conflict-error.js';

const pg = (code: string) => Object.assign(new Error('boom'), { code });
const wrapped = (code: string) =>
  Object.assign(new Error('Failed query'), { cause: { code } });

describe('asConflict', () => {
  it.each(['23505', '40P01'])('turns SQLSTATE %s into a 409', (code) => {
    const result = asConflict(pg(code));

    expect(result).toBeInstanceOf(ConflictException);
    expect((result as ConflictException).message).toBe(CONFLICT_MESSAGE);
  });

  it('reads the code from a wrapped driver error too', () => {
    expect(asConflict(wrapped('40P01'))).toBeInstanceOf(ConflictException);
    expect(asConflict(wrapped('23505'))).toBeInstanceOf(ConflictException);
  });

  it('leaves every other error alone', () => {
    const other = pg('23503');
    const plain = new Error('plain');

    expect(asConflict(other)).toBe(other);
    expect(asConflict(plain)).toBe(plain);
    expect(asConflict('text')).toBe('text');
  });
});

describe('retryable', () => {
  it('rethrows a unique violation or deadlock as a 409 from an async run', async () => {
    await expect(
      retryable(() => Promise.reject(pg('40P01'))),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(retryable(() => Promise.resolve(7))).resolves.toBe(7);
    await expect(
      retryable(() => Promise.reject(new Error('plain'))),
    ).rejects.toThrow('plain');
  });
});
