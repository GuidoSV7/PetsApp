import { normalizeEmail } from '../auth/auth.service.js';
import { MIN_PASSWORD_LENGTH } from '../auth/dto/change-password.dto.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { UserRepository } from '../users/ports/user-repository.port.js';

export type SeedAdminInput = {
  email: string;
  password: string;
  name: string;
};

export type SeedAdminResult =
  | { status: 'created'; userId: string; email: string }
  | { status: 'already_exists'; userId: string; email: string };

export type HashPassword = (plain: string) => Promise<string>;

/**
 * Creates the first `super_admin` when the email is free. Idempotent: a second
 * call with the same email returns `already_exists` and does not mutate the row.
 */
export async function seedSuperAdmin(
  users: UserRepository,
  input: SeedAdminInput,
  hashPassword: HashPassword,
): Promise<SeedAdminResult> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('ADMIN_EMAIL is required');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('ADMIN_NAME is required');
  }
  if (name.length > 120) {
    throw new Error('ADMIN_NAME must be at most 120 characters');
  }

  const password = input.password;
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }

  const existing = await users.findByEmail(email);
  if (existing) {
    return {
      status: 'already_exists',
      userId: existing.id,
      email: existing.email,
    };
  }

  const created = await users.create({
    email,
    password: await hashPassword(password),
    name,
    role: UserRole.SUPER_ADMIN,
  });

  return { status: 'created', userId: created.id, email: created.email };
}
