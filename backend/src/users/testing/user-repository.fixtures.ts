import type { UserData } from '../ports/user-repository.port.js';

export const MISSING_ID = '99999999-9999-4999-8999-999999999999';

/** A valid payload; `overrides` may hold invalid values on purpose. */
export const userData = (overrides: Record<string, unknown> = {}): UserData =>
  ({
    email: 'ada@example.com',
    password: 'hashed-password',
    name: 'Ada',
    ...overrides,
  }) as UserData;

export const pause = () => new Promise((resolve) => setTimeout(resolve, 15));
