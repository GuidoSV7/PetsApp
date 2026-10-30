import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  uniqueIndex,
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
    email: varchar('email', { length: 255 }),
    password: varchar('password', { length: 255 }),
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
    coins: integer('coins').notNull().default(0),
    hunger: integer('hunger').notNull().default(72),
    fun: integer('fun').notNull().default(80),
    energy: integer('energy').notNull().default(65),
    hygiene: integer('hygiene').notNull().default(78),
    coatPrimary: varchar('coat_primary', { length: 7 }).notNull().default('#8a8a8e'),
    coatSecondary: varchar('coat_secondary', { length: 7 })
      .notNull()
      .default('#b4b4b8'),
    coatAccent: varchar('coat_accent', { length: 7 }).notNull().default('#c9a0a8'),
    coatPattern: varchar('coat_pattern', { length: 16 }).notNull().default('solid'),
    statusKey: varchar('status_key', { length: 32 }).notNull().default('idle'),
    name: varchar('name', { length: 16 }).notNull().default('Michi'),
    renameCount: integer('rename_count').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    pk('pk_pet_states', t.id),
    unique('uq_pet_states_guest_key').on(t.guestKey),
  ],
);

/** One testnet identity per user; verification belongs to the auth adapter. */
export const userStellarIdentities = pgTable(
  'user_stellar_identities',
  {
    id: uuidId(),
    userId: uuid('user_id').notNull(),
    network: varchar('network', { length: 16 }).notNull(),
    address: varchar('address', { length: 56 }).notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    pk('pk_user_stellar_identities', t.id),
    fk('fk_stellar_identity_user', t.userId, users.id),
    unique('uq_stellar_identity_user').on(t.userId),
    unique('uq_stellar_identity_network_address').on(t.network, t.address),
  ],
);

/** Store hashes/binding metadata, never signed XDR, cookies or JWTs. */
export const stellarAuthChallenges = pgTable(
  'stellar_auth_challenges',
  {
    id: uuidId(),
    purpose: varchar('purpose', { length: 5 }).notNull(),
    network: varchar('network', { length: 16 }).notNull(),
    address: varchar('address', { length: 56 }).notNull(),
    transactionHash: varchar('transaction_hash', { length: 64 }).notNull(),
    flowHash: varchar('flow_hash', { length: 64 }).notNull(),
    userId: uuid('user_id'),
    sessionHash: varchar('session_hash', { length: 64 }),
    expiresAt: ts('expires_at').notNull(),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    consumedAt: ts('consumed_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    pk('pk_stellar_auth_challenges', t.id),
    fk('fk_stellar_challenge_user', t.userId, users.id),
  ],
);

/** Shared short-lived volume counters; keys contain only scoped hashes. */
export const stellarAuthAttempts = pgTable(
  'stellar_auth_attempts',
  {
    key: varchar('key', { length: 128 }).notNull(),
    windowStartedAt: ts('window_started_at').notNull(),
    expiresAt: ts('expires_at').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [pk('pk_stellar_auth_attempts', t.key)],
);

export const petClaimOperations = pgTable('pet_claim_operations', {
  id: uuidId(),
  userId: uuid('user_id').notNull(),
  accountPetId: uuid('account_pet_id'),
  guestPetId: uuid('guest_pet_id'),
  choice: varchar('choice', { length: 12 }).$type<'keep_account' | 'keep_guest'>(),
  status: varchar('status', { length: 12 }).$type<'pending' | 'confirmed'>().notNull().default('pending'),
  kind: varchar('kind', { length: 12 }).$type<'claim' | 'restore'>().notNull().default('claim'),
  supportActor: varchar('support_actor', { length: 120 }),
  reason: varchar('reason', { length: 500 }),
  result: jsonb('result').$type<{ status: 'confirmed'; operationId: string; petId: string; coins: number }>(),
  createdAt: ts('created_at').notNull().defaultNow(),
  confirmedAt: ts('confirmed_at'),
}, (t) => [
  pk('pk_pet_claim_operations', t.id),
  unique('uq_claim_operation_user').on(t.id, t.userId),
  fk('fk_claim_user', t.userId, users.id),
  fk('fk_claim_account_pet', t.accountPetId, petStates.id),
  fk('fk_claim_guest_pet', t.guestPetId, petStates.id),
  check('ck_claim_choice', sql`${t.choice} IN ('keep_account', 'keep_guest')`),
  check('ck_claim_status', sql`${t.status} IN ('pending', 'confirmed')`),
  check('ck_claim_kind', sql`${t.kind} IN ('claim', 'restore')`),
]);

export const userPetOwnership = pgTable('user_pet_ownership', {
  petId: uuid('pet_id').notNull(),
  userId: uuid('user_id').notNull(),
  status: varchar('status', { length: 8 }).$type<'current' | 'archived'>().notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  archivedAt: ts('archived_at'),
  archiveReason: varchar('archive_reason', { length: 500 }),
  archiveOperationId: uuid('archive_operation_id'),
}, (t) => [
  pk('pk_user_pet_ownership', t.petId),
  unique('uq_owned_pet_user').on(t.petId, t.userId),
  uniqueIndex('uq_user_current_pet').on(t.userId).where(sql`${t.status} = 'current'`),
  fk('fk_ownership_pet', t.petId, petStates.id),
  fk('fk_ownership_user', t.userId, users.id),
  foreignKey({ name: 'fk_ownership_operation', columns: [t.archiveOperationId, t.userId], foreignColumns: [petClaimOperations.id, petClaimOperations.userId] }),
  check('ck_ownership_status', sql`${t.status} IN ('current', 'archived')`),
]);

export const userCoinBalances = pgTable('user_coin_balances', {
  userId: uuid('user_id').notNull(),
  balance: integer('balance').notNull().default(0),
}, (t) => [
  pk('pk_user_coin_balances', t.userId),
  fk('fk_coin_balance_user', t.userId, users.id),
  check('ck_coin_balance_nonnegative', sql`${t.balance} >= 0`),
]);

export const userCoinEntries = pgTable('user_coin_entries', {
  id: uuidId(),
  userId: uuid('user_id').notNull(),
  petId: uuid('pet_id').notNull(),
  operationId: uuid('operation_id').notNull(),
  amount: integer('amount').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [
  pk('pk_user_coin_entries', t.id),
  unique('uq_legacy_credit_pet').on(t.petId),
  fk('fk_coin_entry_user', t.userId, users.id),
  foreignKey({ name: 'fk_coin_entry_pet', columns: [t.petId, t.userId], foreignColumns: [userPetOwnership.petId, userPetOwnership.userId] }),
  foreignKey({ name: 'fk_coin_entry_operation', columns: [t.operationId, t.userId], foreignColumns: [petClaimOperations.id, petClaimOperations.userId] }),
  check('ck_coin_entry_nonnegative', sql`${t.amount} >= 0`),
]);

export const schema = {
  petClaimOperations,
  userPetOwnership,
  userCoinBalances,
  userCoinEntries,
  users,
  roles,
  userRoles,
  petStates,
  userStellarIdentities,
  stellarAuthChallenges,
  stellarAuthAttempts,
};
