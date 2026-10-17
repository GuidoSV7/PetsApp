import { ConflictException } from '@nestjs/common';
import { pgErrorCode } from './pg-error.util.js';

export const CONFLICT_MESSAGE = 'Conflict, please retry';

/** unique_violation and deadlock_detected: another request won, retrying is safe. */
const RETRYABLE = new Set(['23505', '40P01']);

/** A 409 for a unique violation or a deadlock; any other error is returned as is. */
export function asConflict(error: unknown): unknown {
  const code = pgErrorCode(error);
  return code !== undefined && RETRYABLE.has(code)
    ? new ConflictException(CONFLICT_MESSAGE)
    : error;
}

/** Runs `work`; a retryable database conflict surfaces as a 409, not a raw 500. */
export async function retryable<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw asConflict(error);
  }
}
