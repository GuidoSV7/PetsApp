import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from './decorators/public.decorator.js';
import { AuthOriginGuard } from './guards/auth-origin.guard.js';
import { setSessionCookie, tokenLifetimeMs } from './session-cookie.js';
import { StellarAuthService } from './stellar-auth.service.js';
import { StellarChallengeDto } from './dto/stellar-challenge.dto.js';
import { StellarVerifyDto } from './dto/stellar-verify.dto.js';
import { setStellarFlowCookie } from './stellar-flow-cookie.js';
import { stellarHttpResult, stellarRequestContext, stellarSecureCookies } from './stellar-http.js';

@Controller('auth/stellar')
@Public()
@UseGuards(AuthOriginGuard)
export class StellarAuthController {
  constructor(private readonly service: StellarAuthService, private readonly config: ConfigService) {}

  @Post('challenge')
  @HttpCode(200)
  challenge(@Body() dto: StellarChallengeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return stellarHttpResult(res, async () => {
      const secure = stellarSecureCookies(this.config);
      const context = stellarRequestContext(req, 'login', secure, true);
      const result = await this.service.challenge('login', dto.address, context);
      setStellarFlowCookie(res, 'login', secure, context.flow);
      return result;
    });
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body() dto: StellarVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return stellarHttpResult(res, async () => {
      const secure = stellarSecureCookies(this.config);
      const result = await this.service.verify('login', dto, stellarRequestContext(req, 'login', secure));
      setSessionCookie(res, result.token!, { secure, maxAgeMs: tokenLifetimeMs(result.token!) });
      return { user: result.user };
    });
  }
}
