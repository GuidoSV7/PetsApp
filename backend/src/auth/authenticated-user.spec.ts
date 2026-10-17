import { describe, expectTypeOf, it } from 'vitest';
import type { UserRow } from '../users/ports/user-repository.port.js';
import type { AuthenticatedUser } from './authenticated-user.js';

// Compile-time contract, enforced by `tsc` (vitest does not typecheck).
describe('AuthenticatedUser', () => {
  it('is the users row without the password hash', () => {
    expectTypeOf<AuthenticatedUser>().not.toHaveProperty('password');
    expectTypeOf<AuthenticatedUser>().toHaveProperty('id').toBeString();
    expectTypeOf<AuthenticatedUser>().toHaveProperty('role');
    expectTypeOf<UserRow>().toMatchTypeOf<AuthenticatedUser>();
  });
});
