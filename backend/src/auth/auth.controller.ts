import {
  Controller,
  Logger,
  Post,
  Body,
  Get,
  HttpCode,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, type SessionResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleLoginDto } from './dto/google-login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyPasswordDto } from './dto/verify-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { AuthOriginGuard } from './guards/auth-origin.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { UserRow } from '../users/ports/user-repository.port.js';
import { Public } from './decorators/public.decorator.js';
import {
  clearSessionCookie,
  isProductionEnv,
  setSessionCookie,
  tokenLifetimeMs,
} from './session-cookie.js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private secureCookie(): boolean {
    return isProductionEnv({
      NODE_ENV: this.configService.get<string>('NODE_ENV'),
      PROD: this.configService.get<string>('PROD'),
    });
  }

  @Post('login')
  @Public()
  @UseGuards(AuthOriginGuard)
  // 10 attempts per minute per client IP to slow down brute force.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(res, await this.authService.login(loginDto));
  }

  /** Public sign-up: same throttle, origin check, cookie and body as login. */
  @Post('register')
  @Public()
  @UseGuards(AuthOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(
      res,
      await this.authService.register(registerDto),
    );
  }

  /** Google Identity Services ID token → same session shape as login. */
  @Post('google')
  @Public()
  @UseGuards(AuthOriginGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async googleLogin(
    @Body() body: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(
      res,
      await this.authService.loginWithGoogle(body.idToken),
    );
  }

  /** Body `{ user, token }` plus the HttpOnly session cookie. */
  private respondWithSession(res: Response, result: SessionResult) {
    setSessionCookie(res, result.token, {
      secure: this.secureCookie(),
      maxAgeMs: this.cookieLifetimeMs(result.token),
    });
    return result;
  }

  /**
   * Cookie lifetime = token lifetime. A token without a readable `exp` must
   * not become Max-Age=0 (an instant delete): fall back to a session cookie
   * (the JWT still expires server-side) and log it.
   */
  private cookieLifetimeMs(token: string): number | undefined {
    try {
      return tokenLifetimeMs(token);
    } catch (error) {
      this.logger.warn(
        `Session cookie issued without Max-Age: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  @Post('logout')
  @Public()
  @UseGuards(AuthOriginGuard)
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    clearSessionCookie(res, { secure: this.secureCookie() });
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserRow) {
    return this.authService.getProfile(user);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: UserRow,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('verify-password')
  @UseGuards(JwtAuthGuard)
  verifyPassword(
    @CurrentUser() user: UserRow,
    @Body() verifyPasswordDto: VerifyPasswordDto,
  ) {
    return this.authService.verifyPassword(user, verifyPasswordDto.password);
  }
}
