import { UserRole } from '../users/enums/user-role.enum.js';

/** Privilege order of the built-in roles; a higher rank implies the lower ones. */
const RANK: Record<UserRole, number> = {
  [UserRole.MEMBER]: 0,
  [UserRole.ADMIN]: 1,
  [UserRole.SUPER_ADMIN]: 2,
};

const asList = (role: UserRole | readonly UserRole[]): UserRole[] =>
  typeof role === 'string' ? [role] : [...role];

/** Highest privilege in the set. An empty set reads as member. */
export function primaryRole(roles: readonly UserRole[]): UserRole {
  return [...roles].sort((a, b) => RANK[b] - RANK[a])[0] ?? UserRole.MEMBER;
}

/** Unique codes, highest privilege first. */
export function orderedRoles(codes: readonly UserRole[]): UserRole[] {
  return [...new Set(codes)].sort((a, b) => RANK[b] - RANK[a]);
}

/** Any assigned built-in role may sign in; a user with no role cannot. */
export function canSignIn(role: UserRole | readonly UserRole[]): boolean {
  return asList(role).some((item) => item in RANK);
}

/**
 * `required` is satisfied by holding one of the listed roles, or by being a
 * super admin when an admin is required (super admin outranks admin).
 */
export function roleSatisfies(
  role: UserRole | readonly UserRole[],
  required: readonly UserRole[],
): boolean {
  return asList(role).some(
    (item) =>
      required.includes(item) ||
      (item === UserRole.SUPER_ADMIN && required.includes(UserRole.ADMIN)),
  );
}
