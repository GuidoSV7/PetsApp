import type { UserRole } from '../../users/enums/user-role.enum.js';
import type { Permission } from '../permission-catalog.js';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export type RoleCatalogItem = {
  code: string;
  name: string;
  active: boolean;
  permissions: Permission[];
};

export type RolePatch = {
  active?: boolean;
  permissions?: Permission[];
};

export interface RoleRepository {
  list(): Promise<RoleCatalogItem[]>;
  codesFor(userId: string): Promise<UserRole[]>;
  replace(userId: string, codes: UserRole[]): Promise<UserRole[]>;
  create(item: RoleCatalogItem): Promise<RoleCatalogItem>;
  save(code: string, patch: RolePatch): Promise<RoleCatalogItem | null>;
}
