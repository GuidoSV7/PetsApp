import {
  type AnyPgColumn,
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// PetsApp schema. drizzle-kit reads this file.

const uuidId = () => uuid('id').defaultRandom().notNull();
const ts = (name: string) =>
  timestamp(name, { mode: 'date', withTimezone: true });

const pk = (name: string, ...columns: [AnyPgColumn, ...AnyPgColumn[]]) =>
  primaryKey({ name, columns });
const fk = (
  name: string,
  column: AnyPgColumn,
  foreignColumn: AnyPgColumn,
  onDelete?: 'cascade',
) => {
  const constraint = foreignKey({
    name,
    columns: [column],
    foreignColumns: [foreignColumn],
  });
  return onDelete ? constraint.onDelete(onDelete) : constraint;
};

export const users = pgTable(
  'users',
  {
    id: uuidId(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    isBlocked: boolean('is_blocked').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    profileImage: varchar('profile_image', { length: 500 }),
    country: varchar('country', { length: 2 }),
    isVerified: boolean('is_verified').notNull().default(false),
    lastLogin: ts('last_login'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [pk('pk_users', t.id), unique('uq_users_email').on(t.email)],
);

/**
 * Role catalog. `code` is the stable identifier (`admin`, `super_admin`,
 * `member`, or a slug derived from a custom role name); `permissions` is the
 * list of granted permission codes from `permission-catalog.ts`, stored as a
 * JSON array (mirrors the source project's choice over a join table).
 */
export const roles = pgTable(
  'roles',
  {
    id: uuidId(),
    code: varchar('code', { length: 40 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  },
  (t) => [pk('pk_roles', t.id), unique('uq_roles_code').on(t.code)],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id').notNull(),
  },
  (t) => [
    pk('pk_user_roles', t.userId, t.roleId),
    fk('fk_user_roles_user', t.userId, users.id, 'cascade'),
    fk('fk_user_roles_role', t.roleId, roles.id, 'cascade'),
  ],
);

/** One virtual-pet save per anonymous guest key (home UI). */
export const petStates = pgTable(
  'pet_states',
  {
    id: uuidId(),
    guestKey: varchar('guest_key', { length: 64 }).notNull(),
    coins: integer('coins').notNull().default(30),
    hunger: integer('hunger').notNull().default(72),
    fun: integer('fun').notNull().default(80),
    energy: integer('energy').notNull().default(65),
    hygiene: integer('hygiene').notNull().default(78),
    coatPrimary: varchar('coat_primary', { length: 7 }).notNull().default('#8a8a8e'),
    coatSecondary: varchar('coat_secondary', { length: 7 })
      .notNull()
      .default('#b4b4b8'),
    coatAccent: varchar('coat_accent', { length: 7 }).notNull().default('#c9a0a8'),
    statusKey: varchar('status_key', { length: 32 }).notNull().default('idle'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    pk('pk_pet_states', t.id),
    unique('uq_pet_states_guest_key').on(t.guestKey),
  ],
);

export const schema = { users, roles, userRoles, petStates };
