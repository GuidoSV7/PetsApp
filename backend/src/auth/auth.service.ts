import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
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
import { UserRole } from '../users/enums/user-role.enum.js';
import { pgErrorCode } from '../database/pg-error.util.js';
import { logInfo, logWarn } from '../logging/service-log.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { MIN_PASSWORD_LENGTH } from './dto/change-password.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

export const INVALID_CREDENTIALS = 'Invalid credentials';
export const EMAIL_TAKEN = 'Email already registered';
const BCRYPT_ROUNDS = 10;
/** Postgres unique_violation: another request registered the email first. */
const UNIQUE_VIOLATION = '23505';

/** Lower-case, trimmed: the stored form of every email. */
export const normalizeEmail = (email: string): string =>
  email.toLowerCase().trim();

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

export interface SessionResult {
  user: SessionUser;
  token: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<SessionResult> {
    const { email, password } = loginDto;
    const rejected = (reason: string, userId?: string): never => {
      logWarn(this.logger, 'auth_login_rejected', 'auth login rejected', {
        userId,
        reason,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    };

    const user = await this.userRepository.findByEmail(normalizeEmail(email));
    if (!user) return rejected('invalid_credentials');
    if (!user.isActive) return rejected('inactive', user.id);
    if (user.isBlocked) return rejected('blocked', user.id);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return rejected('invalid_credentials', user.id);

    if (!canSignIn(user.roles?.length ? user.roles : user.role)) {
      return rejected('role_denied', user.id);
    }

    logInfo(this.logger, 'auth_login', 'auth login', { userId: user.id });
    return this.issueSession(user);
  }

  /**
   * Public sign-up: creates a `member` and signs it in, answering exactly
   * what `login` answers. A taken email is a 409 (the pre-check covers the
   * common case; the unique index covers the race).
   */
  async register(dto: RegisterDto): Promise<SessionResult> {
    const email = normalizeEmail(dto.email);
    if (dto.password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `The password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      );
    }
    if (await this.userRepository.findByEmail(email)) {
      this.rejectRegistration('email_taken');
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let user: UserRow;
    try {
      user = await this.userRepository.create({
        email,
        password,
        name: dto.name.trim(),
        role: UserRole.MEMBER,
        country: dto.country?.trim().toUpperCase() || null,
      });
    } catch (error) {
      if (pgErrorCode(error) === UNIQUE_VIOLATION) {
        this.rejectRegistration('email_taken');
      }
      throw error;
    }

    logInfo(this.logger, 'auth_registered', 'auth registered', {
      userId: user.id,
    });
    return this.issueSession(user);
  }

  private rejectRegistration(reason: string): never {
    logWarn(this.logger, 'auth_register_rejected', 'auth register rejected', {
      reason,
    });
    throw new ConflictException(EMAIL_TAKEN);
  }

  /** Signs the JWT for a user that passed every sign-in check. */
  private issueSession(user: UserRow): SessionResult {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { user: sessionUser(user), token: this.jwtService.sign(payload) };
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
