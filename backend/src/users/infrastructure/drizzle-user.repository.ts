import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { DrizzleDb } from '../../database/database.module.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { definedFields } from '../../database/update-patch.util.js';
import { users } from '../../db/schema.js';
import { UserRole } from '../enums/user-role.enum.js';
import type {
  UserData,
  UserListFilter,
  UserPublicRow,
  UserRepository,
  UserRow,
} from '../ports/user-repository.port.js';
import {
  assertKnownRole,
  loadRoleCodes,
  replaceUserRoles,
  withRoles,
} from '../../roles/infrastructure/role-rows.js';

const COLUMNS = [
  'email',
  'password',
  'name',
  'isBlocked',
  'isActive',
  'profileImage',
  'country',
  'isVerified',
  'tokenVersion',
  'lastLogin',
] as const;

/** Escapes `%`, `_` and `\` so they match themselves (S11). */
const escapeLike = (input: string): string =>
  input.replace(/[\\%_]/g, '\\$&');

/** Every column except the password hash. */
const { password: _passwordHash, ...PUBLIC_COLUMNS } = getTableColumns(users);

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async create(data: UserData): Promise<UserRow> {
    const role = data.role ?? UserRole.MEMBER;
    assertKnownRole(role);
    const values = definedFields(data, COLUMNS) as typeof users.$inferInsert;
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(users).values(values).returning();
      const assigned = await replaceUserRoles(tx, row.id, [role]);
      return withRoles(row, assigned);
    });
  }

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!row) return null;
    return (await this.attach([row]))[0];
  }

  async findPublicById(id: string): Promise<UserPublicRow | null> {
    const user = await this.findById(id);
    if (!user) return null;
    const { password: _hash, ...rest } = user;
    return rest;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!row) return null;
    return (await this.attach([row]))[0];
  }

  async findMany(filter: UserListFilter = {}): Promise<UserPublicRow[]> {
    const { search, includeInactive, limit, offset } = filter;
    const filters: SQL[] = [];
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      filters.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!);
    }
    if (includeInactive === false) filters.push(eq(users.isActive, true));

    const rows = await this.db
      .select(PUBLIC_COLUMNS)
      .from(users)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(users.id))
      .limit(limit ?? -1)
      .offset(offset ?? 0);
    const grouped = await loadRoleCodes(
      this.db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => withRoles(row, grouped.get(row.id) ?? []));
  }

  async update(id: string, patch: Partial<UserData>): Promise<UserRow | null> {
    if (patch.role !== undefined) assertKnownRole(patch.role);
    const values = definedFields(patch, COLUMNS);
    if (Object.keys(values).length === 0 && patch.role === undefined) {
      return this.findById(id);
    }

    return this.db.transaction(async (tx) => {
      const [row] =
        Object.keys(values).length === 0
          ? await tx.select().from(users).where(eq(users.id, id)).limit(1)
          : await tx
              .update(users)
              .set(values)
              .where(eq(users.id, id))
              .returning();
      if (!row) return null;
      if (patch.role !== undefined) {
        const assigned = await replaceUserRoles(tx, row.id, [patch.role]);
        return withRoles(row, assigned);
      }
      const grouped = await loadRoleCodes(tx, [row.id]);
      return withRoles(row, grouped.get(row.id) ?? []);
    });
  }

  /** S12: `UPDATE ... SET is_blocked = NOT is_blocked RETURNING *`. */
  async toggleBlock(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .update(users)
      .set({ isBlocked: sql`NOT ${users.isBlocked}` })
      .where(eq(users.id, id))
      .returning();
    if (!row) return null;
    const grouped = await loadRoleCodes(this.db, [row.id]);
    return withRoles(row, grouped.get(row.id) ?? []);
  }

  private async attach(
    rows: (typeof users.$inferSelect)[],
  ): Promise<UserRow[]> {
    const grouped = await loadRoleCodes(
      this.db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => withRoles(row, grouped.get(row.id) ?? []));
  }
}
