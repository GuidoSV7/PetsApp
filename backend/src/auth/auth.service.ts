import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { canSignIn } from './role-rank.js';
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserRow,
} from '../users/ports/user-repository.port.js';
import { logInfo, logWarn } from '../logging/service-log.js';
import { LoginDto } from './dto/login.dto.js';
import { MIN_PASSWORD_LENGTH } from './dto/change-password.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

export const INVALID_CREDENTIALS = 'Invalid credentials';
const BCRYPT_ROUNDS = 10;

/** The user as the session endpoints expose it. */
export const sessionUser = (user: UserRow) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  roles: user.roles?.length ? user.roles : [user.role],
  country: user.country,
});

export type SessionUser = ReturnType<typeof sessionUser>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: SessionUser; token: string }> {
    const { email, password } = loginDto;
    const rejected = (reason: string, userId?: string): never => {
      logWarn(this.logger, 'auth_login_rejected', 'auth login rejected', {
        userId,
        reason,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    };

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) return rejected('invalid_credentials');
    if (!user.isActive) return rejected('inactive', user.id);
    if (user.isBlocked) return rejected('blocked', user.id);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return rejected('invalid_credentials', user.id);

    if (!canSignIn(user.roles?.length ? user.roles : user.role)) {
      return rejected('role_denied', user.id);
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);
    logInfo(this.logger, 'auth_login', 'auth login', { userId: user.id });

    return { user: sessionUser(user), token };
  }

  getProfile(user: UserRow): SessionUser {
    return sessionUser(user);
  }

  async changePassword(
    user: UserRow,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      logWarn(
        this.logger,
        'auth_password_change_rejected',
        'auth password change rejected',
        { userId: user.id, reason: 'invalid_current_password' },
      );
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      logWarn(
        this.logger,
        'auth_password_change_rejected',
        'auth password change rejected',
        { userId: user.id, reason: 'password_too_short' },
      );
      throw new BadRequestException(
        `The new password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepository.update(user.id, { password: hashedPassword });
    logInfo(this.logger, 'auth_password_changed', 'auth password changed', {
      userId: user.id,
    });

    return { message: 'Password updated successfully' };
  }

  async verifyPassword(
    user: UserRow,
    password: string,
  ): Promise<{ verified: true }> {
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password');
    }
    return { verified: true };
  }
}
