import type { NewUserRow, UserRow } from '../../db/types.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/**
 * The full row, password hash included. Internal consumers (login, password
 * change, the jwt strategy) need it: it must never reach a response.
 */
export type { UserRow };

/** A row without the password hash, for reads that never need it. */
export type UserPublicRow = Omit<UserRow, 'password'>;

/**
 * Writable columns. `id` is database-owned (uuid default). `createdAt` is a
 * database default and `updatedAt` is never written by the repository.
 */
export type UserData = Omit<NewUserRow, 'id' | 'createdAt' | 'updatedAt'>;

export interface UserListFilter {
  /** `LIKE %search%` on name or email (case-sensitive); empty means no filter. */
  search?: string;
  /** `false` hides inactive users; `undefined` and `true` list everyone. */
  includeInactive?: boolean;
}

export interface UserRepository {
  /**
   * `undefined` values are ignored and the stored row comes back with its
   * defaults. Rejects on a duplicate email (unique violation, the raw
   * database error), on NOT NULL violations and on an unknown role.
   */
  create(data: UserData): Promise<UserRow>;
  /** Rejects on a malformed uuid (Postgres 22P02). */
  findById(id: string): Promise<UserRow | null>;
  /** Same as `findById` without the password hash. */
  findPublicById(id: string): Promise<UserPublicRow | null>;
  /** Exact, case-sensitive email match. */
  findByEmail(email: string): Promise<UserRow | null>;
  /** `id` DESC, password hash excluded. */
  findMany(filter?: UserListFilter): Promise<UserPublicRow[]>;
  /**
   * `undefined` values and unknown keys are ignored; an empty patch returns
   * the current row without writing; `null` is a real value. Returns `null`
   * when the id is missing. Does not touch `updatedAt`.
   */
  update(id: string, patch: Partial<UserData>): Promise<UserRow | null>;
}
