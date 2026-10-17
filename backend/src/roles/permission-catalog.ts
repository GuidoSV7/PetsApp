/**
 * Permission catalog: the codes a role may grant. Extend this list when a new
 * capability appears; `RolesService` and the DTOs validate against it, and
 * `roles.permissions` stores the granted subset as a JSON array.
 */
export const PERMISSIONS = [
  'users:read',
  'users:write',
  'roles:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && PERMISSIONS.includes(value as Permission);
}

/** Stable slug for a custom role name: `Vet Assistant` -> `vet_assistant`. */
export function roleCodeFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}
