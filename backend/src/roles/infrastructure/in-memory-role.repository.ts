import { UserRole } from '../../users/enums/user-role.enum.js';
import { orderedRoles } from '../../auth/role-rank.js';
import { PERMISSIONS, type Permission } from '../permission-catalog.js';
import type {
  RoleCatalogItem,
  RolePatch,
  RoleRepository,
} from '../ports/role-repository.port.js';
import { ROLE_NAMES } from './role-rows.js';

const ALL: Permission[] = [...PERMISSIONS];

function copy(role: RoleCatalogItem): RoleCatalogItem {
  return { ...role, permissions: [...role.permissions] };
}

/** In-memory `RoleRepository` seeded with the three built-in roles. */
export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles: RoleCatalogItem[] = [
    {
      code: UserRole.ADMIN,
      name: ROLE_NAMES[UserRole.ADMIN],
      active: true,
      permissions: [...ALL],
    },
    {
      code: UserRole.SUPER_ADMIN,
      name: ROLE_NAMES[UserRole.SUPER_ADMIN],
      active: true,
      permissions: [...ALL],
    },
    {
      code: UserRole.MEMBER,
      name: ROLE_NAMES[UserRole.MEMBER],
      active: true,
      permissions: [],
    },
  ];

  private readonly assigned = new Map<string, UserRole[]>();

  list(): Promise<RoleCatalogItem[]> {
    return Promise.resolve(this.roles.map(copy));
  }

  codesFor(userId: string): Promise<UserRole[]> {
    return Promise.resolve([...(this.assigned.get(userId) ?? [])]);
  }

  replace(userId: string, codes: UserRole[]): Promise<UserRole[]> {
    const next = orderedRoles(codes);
    this.assigned.set(userId, next);
    return Promise.resolve([...next]);
  }

  create(item: RoleCatalogItem): Promise<RoleCatalogItem> {
    if (this.roles.some((role) => role.code === item.code)) {
      return Promise.reject(
        new Error(
          'duplicate key value violates unique constraint "uq_roles_code"',
        ),
      );
    }
    const saved = copy(item);
    this.roles.push(saved);
    return Promise.resolve(copy(saved));
  }

  save(code: string, patch: RolePatch): Promise<RoleCatalogItem | null> {
    const role = this.roles.find((item) => item.code === code);
    if (!role) return Promise.resolve(null);
    if (patch.active !== undefined) role.active = patch.active;
    if (patch.permissions) role.permissions = [...patch.permissions];
    return Promise.resolve(copy(role));
  }
}
