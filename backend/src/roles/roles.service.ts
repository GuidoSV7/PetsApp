import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { traceWrite } from '../logging/service-log.js';
import { orderedRoles } from '../auth/role-rank.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  isPermission,
  roleCodeFromName,
  type Permission,
} from './permission-catalog.js';
import {
  ROLE_REPOSITORY,
  type RoleCatalogItem,
  type RoleRepository,
} from './ports/role-repository.port.js';

const KNOWN = new Set<string>(Object.values(UserRole));

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
  ) {}

  list(): Promise<RoleCatalogItem[]> {
    return this.roles.list();
  }

  create(input: {
    name: string;
    permissions: readonly string[];
  }): Promise<RoleCatalogItem> {
    return traceWrite(
      this.logger,
      'role_created',
      {},
      async () => {
        const name = input.name.trim();
        if (!name || name.length > 80) {
          throw new BadRequestException('Invalid role name');
        }
        const permissions = this.parsePermissions(input.permissions);
        const code = roleCodeFromName(name);
        if (!code) {
          throw new BadRequestException('Invalid role name');
        }
        const existing = await this.roles.list();
        const taken = existing.some(
          (role) =>
            role.code === code ||
            role.name.toLowerCase() === name.toLowerCase(),
        );
        if (taken) {
          throw new BadRequestException('A role with that name already exists');
        }
        return this.roles.create({ code, name, active: true, permissions });
      },
      (saved) => ({ code: saved.code }),
    );
  }

  update(
    code: string,
    patch: { active?: boolean; permissions?: readonly string[] },
  ): Promise<RoleCatalogItem> {
    return traceWrite(this.logger, 'role_updated', { code }, async () => {
      if (code === UserRole.SUPER_ADMIN) {
        throw new BadRequestException(
          'The super administrator role cannot be modified',
        );
      }
      const permissions =
        patch.permissions === undefined
          ? undefined
          : this.parsePermissions(patch.permissions);
      const saved = await this.roles.save(code, {
        active: patch.active,
        permissions,
      });
      if (!saved) throw new NotFoundException('Role not found');
      return saved;
    });
  }

  private parsePermissions(input: readonly string[]): Permission[] {
    const unique = [...new Set(input)];
    if (unique.length === 0) {
      throw new BadRequestException('Choose at least one permission');
    }
    if (!unique.every(isPermission)) {
      throw new BadRequestException('Invalid permission');
    }
    return unique;
  }

  replace(
    userId: string,
    codes: readonly string[],
  ): Promise<{ roles: UserRole[] }> {
    return traceWrite(this.logger, 'roles_replaced', { userId }, async () => {
      const unique = [...new Set(codes)];
      if (unique.length === 0 || unique.some((code) => !KNOWN.has(code))) {
        throw new BadRequestException(
          unique.length === 0
            ? 'The user needs at least one role'
            : 'Invalid role',
        );
      }
      const roles = orderedRoles(
        await this.roles.replace(userId, unique as UserRole[]),
      );
      return { roles };
    });
  }
}
