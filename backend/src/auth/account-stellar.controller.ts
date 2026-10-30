import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { StellarAuthService } from './stellar-auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthOriginGuard } from './guards/auth-origin.guard.js';
import type { StellarRequestContext } from './stellar-auth.service.js';
import { StellarLinkChallengeDto } from './dto/stellar-link-challenge.dto.js';
import { StellarVerifyDto } from './dto/stellar-verify.dto.js';
import { setStellarFlowCookie } from './stellar-flow-cookie.js';
import { stellarHttpResult, stellarRequestContext, stellarSecureCookies } from './stellar-http.js';

@Controller('account/stellar')
@UseGuards(JwtAuthGuard)
export class AccountStellarController {
  constructor(private readonly service: StellarAuthService, private readonly config: ConfigService) {}

  @Get()
  identity(@Req() req: Request) {
    return this.service.identity((req.user as NonNullable<StellarRequestContext['user']>).id);
  }

  @Post('challenge')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard)
  challenge(@Body() dto: StellarLinkChallengeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return stellarHttpResult(res, async () => {
      const secure = stellarSecureCookies(this.config);
      const context = stellarRequestContext(req, 'link', secure, true);
      const result = await this.service.challenge('link', dto.address, context, dto.password);
      setStellarFlowCookie(res, 'link', secure, context.flow);
      return result;
    });
  }

  @Post('verify')
  @HttpCode(200)
  @UseGuards(AuthOriginGuard)
  async verify(@Body() dto: StellarVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return stellarHttpResult(res, async () => {
      const context = stellarRequestContext(req, 'link', stellarSecureCookies(this.config));
      const result = await this.service.verify('link', dto, context);
      return this.service.identity(result.user.id);
    });
  }
}
