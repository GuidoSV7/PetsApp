import { describe, expect, it } from 'vitest';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  canSignIn,
  orderedRoles,
  primaryRole,
  roleSatisfies,
} from './role-rank.js';

describe('primaryRole and orderedRoles', () => {
  it('ranks super_admin over admin over member and dedupes', () => {
    expect(primaryRole([UserRole.MEMBER, UserRole.ADMIN])).toBe(UserRole.ADMIN);
    expect(primaryRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])).toBe(
      UserRole.SUPER_ADMIN,
    );
    expect(primaryRole([])).toBe(UserRole.MEMBER);
    expect(
      orderedRoles([UserRole.MEMBER, UserRole.SUPER_ADMIN, UserRole.MEMBER]),
    ).toEqual([UserRole.SUPER_ADMIN, UserRole.MEMBER]);
  });
});

describe('canSignIn', () => {
  it('allows every built-in role', () => {
    expect(canSignIn(UserRole.ADMIN)).toBe(true);
    expect(canSignIn(UserRole.SUPER_ADMIN)).toBe(true);
    expect(canSignIn(UserRole.MEMBER)).toBe(true);
  });

  it('rejects a user with no role and ignores unknown codes', () => {
    expect(canSignIn([UserRole.MEMBER, UserRole.ADMIN])).toBe(true);
    expect(canSignIn([])).toBe(false);
    expect(canSignIn(['ghost' as UserRole])).toBe(false);
  });
});

describe('roleSatisfies', () => {
  it('lets a super admin pass an admin requirement and rejects a member', () => {
    expect(roleSatisfies(UserRole.SUPER_ADMIN, [UserRole.ADMIN])).toBe(true);
    expect(roleSatisfies(UserRole.ADMIN, [UserRole.ADMIN])).toBe(true);
    expect(roleSatisfies(UserRole.MEMBER, [UserRole.ADMIN])).toBe(false);
    expect(
      roleSatisfies([UserRole.MEMBER, UserRole.ADMIN], [UserRole.ADMIN]),
    ).toBe(true);
    expect(roleSatisfies([UserRole.MEMBER], [UserRole.SUPER_ADMIN])).toBe(
      false,
    );
  });

  it('does not let an admin pass a super admin requirement', () => {
    expect(roleSatisfies(UserRole.ADMIN, [UserRole.SUPER_ADMIN])).toBe(false);
  });
});
