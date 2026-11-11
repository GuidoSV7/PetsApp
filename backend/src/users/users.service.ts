import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { traceWrite } from '../logging/service-log.js';
import { primaryRole, rankOf } from '../auth/role-rank.js';
import { EMAIL_TAKEN, normalizeEmail } from '../auth/auth.service.js';
import { pgErrorCode } from '../database/pg-error.util.js';
import { CompleteUserDto } from './dto/complete-user.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import {
  USER_REPOSITORY,
  type UserData,
  type UserPublicRow,
  type UserRepository,
  type UserRow,
} from './ports/user-repository.port.js';

/** The only columns a profile update may write (everything else is ignored). */
export type UpdateUserInput = Partial<
  Pick<UserData, 'name' | 'email' | 'profileImage' | 'country'>
> & {
  /** S5: required whenever the email actually changes. */
  currentPassword?: string;
};

export const userNotFound = (id: string) =>
  new NotFoundException(`User with id ${id} not found`);

/** S2: an admin may never manage an account of equal or higher rank. */
export const MANAGE_RANK_MESSAGE =
  'Only a super admin can manage an account of equal or higher rank';
const SELF_BLOCK_MESSAGE = 'You cannot block your own account';
const EMAIL_CHANGE_PASSWORD_MESSAGE =
  'the current password is required to change the email';

const rankOfUser = (user: { role: string; roles?: string[] }): number =>
  rankOf(primaryRole((user.roles?.length ? user.roles : [user.role]) as never));

/** Never answer the password hash. */
const withoutPassword = ({ password: _hash, ...rest }: UserRow) => rest;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  private async requirePublic(id: string): Promise<UserPublicRow> {
    const user = await this.users.findPublicById(id);
    if (!user) throw userNotFound(id);
    return user;
  }

  /** Profile of the authenticated user: only their own, non-sensitive data. */
  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.requirePublic(userId);

    return {
      id: user.id,
      email: user.email,
      userName: user.name,
      role: user.role,
      roles: user.roles,
      isBlocked: user.isBlocked,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toCompleteDto(user: UserPublicRow): CompleteUserDto {
    return {
      id: user.id,
      email: user.email,
      userName: user.name,
      role: user.role,
      roles: user.roles,
      isBlocked: user.isBlocked,
      isVerified: user.isVerified,
      country: user.country || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin || null,
    };
  }

  /** Administrator list: every column an admin may see. */
  async findAllComplete(
    search?: string,
    includeInactive: boolean = true,
    limit?: number,
    offset?: number,
  ): Promise<CompleteUserDto[]> {
    const users = await this.users.findMany({
      search: search || undefined,
      includeInactive,
      limit,
      offset,
    });
    return users.map((user) => this.toCompleteDto(user));
  }

  /** Administrator detail: every column an admin may see. */
  async findOneComplete(id: string): Promise<CompleteUserDto> {
    return this.toCompleteDto(await this.requirePublic(id));
  }

  /**
   * Profile update. When `actorId` is given and differs from the target,
   * an admin may only touch lower-rank accounts (S2). `currentPassword` is
   * required whenever the email actually changes (S5), and a confirmed email
   * change resets `isVerified`. A taken email answers 409 (S4).
   */
  update(id: string, updateData: UpdateUserInput, actorId?: string) {
    return traceWrite(this.logger, 'user_updated', { id }, async () => {
      const current = await this.requirePublic(id);
      if (actorId && actorId !== id) {
        const actor = await this.requirePublic(actorId);
        if (rankOfUser(actor) <= rankOfUser(current)) {
          throw new ForbiddenException(MANAGE_RANK_MESSAGE);
        }
      }

      const emailConfirmed =
        updateData.email === undefined
          ? undefined
          : normalizeEmail(updateData.email);
      const emailChanged =
        emailConfirmed !== undefined && emailConfirmed !== current.email;
      if (emailChanged) {
        if (updateData.currentPassword === undefined) {
          throw new BadRequestException(EMAIL_CHANGE_PASSWORD_MESSAGE);
        }
        const stored = await this.users.findById(id);
        const verified =
          stored &&
          (await bcrypt.compare(updateData.currentPassword, stored.password));
        if (!verified) {
          throw new UnauthorizedException('Incorrect password');
        }
      }

      const patch = {
        name: updateData.name,
        email: emailConfirmed,
        profileImage: updateData.profileImage,
        country: updateData.country,
        ...(emailChanged ? { isVerified: false as const } : {}),
      };
      let updatedUser: Awaited<ReturnType<UserRepository['update']>>;
      try {
        updatedUser = await this.users.update(id, patch);
      } catch (error) {
        // S4: a taken email is a conflict, never a raw 500.
        throw pgErrorCode(error) === '23505'
          ? new ConflictException(EMAIL_TAKEN)
          : error;
      }
      if (!updatedUser) throw userNotFound(id);
      return withoutPassword(updatedUser);
    });
  }

  /** S2/S12: one-step flip; self-blocks answer 400; rank limits apply. */
  toggleBlock(id: string, actorId?: string) {
    return traceWrite(this.logger, 'user_block_toggled', { id }, async () => {
      if (actorId === id) {
        throw new BadRequestException(SELF_BLOCK_MESSAGE);
      }
      if (actorId !== undefined) {
        const actor = await this.requirePublic(actorId);
        const target = await this.requirePublic(id);
        if (rankOfUser(actor) <= rankOfUser(target)) {
          throw new ForbiddenException(MANAGE_RANK_MESSAGE);
        }
      }
      const updatedUser = await this.users.toggleBlock(id);
      if (!updatedUser) throw userNotFound(id);
      return withoutPassword(updatedUser);
    });
  }

  /** Soft delete: the account is deactivated, never removed. */
  delete(id: string, password: string) {
    return traceWrite(this.logger, 'user_deleted', { id }, async () => {
      const user = await this.users.findById(id);
      if (!user) throw userNotFound(id);

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password');
      }

      await this.users.update(id, { isActive: false });
      return { message: 'Account deactivated successfully' };
    });
  }
}
