import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { traceWrite } from '../logging/service-log.js';
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
>;

export const userNotFound = (id: string) =>
  new NotFoundException(`User with id ${id} not found`);

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
  ): Promise<CompleteUserDto[]> {
    const users = await this.users.findMany({
      search: search || undefined,
      includeInactive,
    });
    return users.map((user) => this.toCompleteDto(user));
  }

  /** Administrator detail: every column an admin may see. */
  async findOneComplete(id: string): Promise<CompleteUserDto> {
    return this.toCompleteDto(await this.requirePublic(id));
  }

  update(id: string, updateData: UpdateUserInput) {
    return traceWrite(this.logger, 'user_updated', { id }, async () => {
      // Explicit mapping: nothing else reaches the repository.
      const updatedUser = await this.users.update(id, {
        name: updateData.name,
        email: updateData.email,
        profileImage: updateData.profileImage,
        country: updateData.country,
      });
      if (!updatedUser) throw userNotFound(id);
      return withoutPassword(updatedUser);
    });
  }

  toggleBlock(id: string) {
    return traceWrite(this.logger, 'user_block_toggled', { id }, async () => {
      const user = await this.requirePublic(id);
      const updatedUser = await this.users.update(id, {
        isBlocked: !user.isBlocked,
      });
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
