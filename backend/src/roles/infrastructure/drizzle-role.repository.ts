import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { roles } from '../../db/schema.js';
import { UserRole } from '../../users/enums/user-role.enum.js';
import { isPermission, type Permission } from '../permission-catalog.js';
import type {
  RoleCatalogItem,
  RolePatch,
  RoleRepository,
} from '../ports/role-repository.port.js';
import { loadRoleCodes, replaceUserRoles } from './role-rows.js';

const CATALOG_COLUMNS = {
  code: roles.code,
  name: roles.name,
  active: roles.isActive,
  permissions: roles.permissions,
};

@Injectable()
export class DrizzleRoleRepository implements RoleRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(): Promise<RoleCatalogItem[]> {
    const rows = await this.db
      .select(CATALOG_COLUMNS)
      .from(roles)
      .orderBy(asc(roles.name));
    return rows.map((row) => ({
      ...row,
      permissions: asPermissions(row.permissions),
    }));
  }

  async codesFor(userId: string): Promise<UserRole[]> {
    const grouped = await loadRoleCodes(this.db, [userId]);
    return grouped.get(userId) ?? [];
  }

  replace(userId: string, codes: UserRole[]): Promise<UserRole[]> {
    return replaceUserRoles(this.db, userId, codes);
  }

  async create(item: RoleCatalogItem): Promise<RoleCatalogItem> {
    await this.db.insert(roles).values({
      code: item.code,
      name: item.name,
      isActive: item.active,
      permissions: item.permissions,
    });
    return { ...item, permissions: [...item.permissions] };
  }

  async save(code: string, patch: RolePatch): Promise<RoleCatalogItem | null> {
    const [current] = await this.db
      .select(CATALOG_COLUMNS)
      .from(roles)
      .where(eq(roles.code, code));
    if (!current) return null;
    const next: RoleCatalogItem = {
      code: current.code,
      name: current.name,
      active: patch.active ?? current.active,
      permissions: patch.permissions ?? asPermissions(current.permissions),
    };
    await this.db
      .update(roles)
      .set({ isActive: next.active, permissions: next.permissions })
      .where(eq(roles.code, code));
    return next;
  }
}

/** Stored JSON may predate the catalog: unknown codes are dropped on read. */
function asPermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPermission);
}
