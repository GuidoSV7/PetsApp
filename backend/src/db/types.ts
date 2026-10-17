import type { UserRole } from '../users/enums/user-role.enum.js';
import type { users } from './schema.js';

// Row types inferred from the Drizzle schema: `<Name>Row` is a selected row,
// `New<Name>Row` is an insert payload (defaulted columns are optional).
// `role` and `roles` are not columns: they come from `user_roles`.

type UserStoredRow = typeof users.$inferSelect;
export type UserRow = UserStoredRow & { role: UserRole; roles: UserRole[] };
export type NewUserRow = typeof users.$inferInsert & { role?: UserRole };
