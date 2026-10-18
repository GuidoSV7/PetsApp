import { randomUUID } from 'node:crypto';
import { definedFields } from '../../database/update-patch.util.js';
import {
  likeMatch,
  requireBoolean,
  requireEnum,
  requireTimestamp,
  requireUuid,
  requireVarchar,
} from '../../testing/postgres-semantics.js';
import { UserRole } from '../enums/user-role.enum.js';
import type {
  UserData,
  UserListFilter,
  UserPublicRow,
  UserRepository,
  UserRow,
} from '../ports/user-repository.port.js';

/** Postgres SQLSTATE for a unique index violation. */
const UNIQUE_VIOLATION = '23505';

const COLUMNS = [
  'email',
  'password',
  'name',
  'role',
  'isBlocked',
  'isActive',
  'profileImage',
  'country',
  'isVerified',
  'lastLogin',
] as const;

/** Column defaults applied by `create` for omitted (`undefined`) values. */
const DEFAULTS = {
  role: UserRole.MEMBER,
  isBlocked: false,
  isActive: true,
  profileImage: null,
  country: null,
  isVerified: false,
  lastLogin: null,
};

type StoredColumns = Omit<UserRow, 'id' | 'createdAt' | 'updatedAt' | 'roles'>;

const copy = (row: UserRow): UserRow => ({
  ...row,
  roles: [...row.roles],
  lastLogin: row.lastLogin && new Date(row.lastLogin),
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
});

const withoutPassword = ({
  password: _hash,
  ...rest
}: UserRow): UserPublicRow => rest;

/**
 * In-memory `UserRepository` with Postgres column semantics, so the fake
 * rejects what the real database rejects. Verified by the shared contract.
 */
export class InMemoryUserRepository implements UserRepository {
  private rows: UserRow[] = [];

  create(data: UserData): Promise<UserRow> {
    try {
      const now = new Date();
      const columns = this.normalize({
        ...DEFAULTS,
        ...definedFields(data, COLUMNS),
      });
      this.assertEmailFree(columns.email);
      const row: UserRow = {
        id: randomUUID(),
        ...columns,
        roles: [columns.role],
        createdAt: now,
        updatedAt: now,
      };
      this.rows.push(row);
      return Promise.resolve(copy(row));
    } catch (error) {
      return Promise.reject(error as Error);
    }
  }

  findById(id: string): Promise<UserRow | null> {
    return this.lookup(id, (row) => row);
  }

  findPublicById(id: string): Promise<UserPublicRow | null> {
    return this.lookup(id, withoutPassword);
  }

  findByEmail(email: string): Promise<UserRow | null> {
    const row = this.rows.find((r) => r.email === email);
    return Promise.resolve(row ? copy(row) : null);
  }

  findMany(filter: UserListFilter = {}): Promise<UserPublicRow[]> {
    const { search, includeInactive } = filter;
    return Promise.resolve(
      this.rows
        .filter(
          (row) =>
            (!search ||
              likeMatch(row.name, `%${search}%`) ||
              likeMatch(row.email, `%${search}%`)) &&
            (includeInactive !== false || row.isActive),
        )
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .map((row) => withoutPassword(copy(row))),
    );
  }

  async update(id: string, patch: Partial<UserData>): Promise<UserRow | null> {
    const current = await this.lookup(id, (row) => row);
    if (!current) return null;
    const values = definedFields(patch, COLUMNS);
    if (Object.keys(values).length === 0) return current;

    const row = this.rows.find((r) => r.id === current.id)!;
    const next = this.normalize({ ...row, ...values });
    this.assertEmailFree(next.email, row.id);
    // `updatedAt` is deliberately left alone: the repository never refreshes it.
    Object.assign(row, next);
    if (values.role) row.roles = [next.role];
    return copy(row);
  }

  /** Postgres uuid semantics: a malformed id rejects instead of missing. */
  private lookup<T>(
    id: string,
    project: (row: UserRow) => T,
  ): Promise<T | null> {
    try {
      const uuid = requireUuid(id, 'id');
      const row = this.rows.find((r) => r.id === uuid);
      return Promise.resolve(row ? project(copy(row)) : null);
    } catch (error) {
      return Promise.reject(error as Error);
    }
  }

  /** Same SQLSTATE as Postgres (23505), so `pgErrorCode` reads the fake alike. */
  private assertEmailFree(email: string, ownId?: string): void {
    if (this.rows.some((r) => r.email === email && r.id !== ownId)) {
      throw Object.assign(
        new Error('duplicate key value violates unique constraint on "email"'),
        { code: UNIQUE_VIOLATION },
      );
    }
  }

  /** Postgres column semantics: NOT NULL, enums, varchar lengths, booleans. */
  private normalize(values: Record<string, unknown>): StoredColumns {
    const nullable = <T>(value: unknown, check: (v: unknown) => T) =>
      value === null ? null : check(value);
    return {
      email: requireVarchar(values.email, 'email', 255),
      password: requireVarchar(values.password, 'password', 255),
      name: requireVarchar(values.name, 'name', 120),
      role: requireEnum(values.role, Object.values(UserRole), 'role'),
      isBlocked: requireBoolean(values.isBlocked, 'isBlocked'),
      isActive: requireBoolean(values.isActive, 'isActive'),
      profileImage: nullable(values.profileImage, (v) =>
        requireVarchar(v, 'profileImage', 500),
      ),
      country: nullable(values.country, (v) => requireVarchar(v, 'country', 2)),
      isVerified: requireBoolean(values.isVerified, 'isVerified'),
      lastLogin: nullable(values.lastLogin, (v) =>
        requireTimestamp(v, 'lastLogin'),
      ),
    };
  }
}
