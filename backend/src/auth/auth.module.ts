import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleAuthLibraryVerifier,
} from './google-token.verifier.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { resolveJwtSecret } from './jwt-secret.js';
import { UsersModule } from '../users/users.module.js';
import { StellarAuthController } from './stellar-auth.controller.js';
import { AccountStellarController } from './account-stellar.controller.js';
import { StellarAuthService } from './stellar-auth.service.js';
import { StellarAuthConfig } from '../config/stellar-auth.config.js';
import { STELLAR_AUTH_REPOSITORY } from './ports/stellar-auth-repository.port.js';
import { STELLAR_WEBAUTH } from './ports/stellar-webauth.port.js';
import { DrizzleStellarAuthRepository } from './infrastructure/drizzle-stellar-auth.repository.js';
import { StellarWebAuthAdapter } from './infrastructure/stellar-webauth.adapter.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '12h') as JwtSignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, StellarAuthController, AccountStellarController],
  providers: [
    AuthService,
    JwtStrategy,
    StellarAuthService,
    StellarAuthConfig,
    { provide: STELLAR_AUTH_REPOSITORY, useClass: DrizzleStellarAuthRepository },
    { provide: STELLAR_WEBAUTH, useClass: StellarWebAuthAdapter },
    GoogleAuthLibraryVerifier,
    {
      provide: GOOGLE_TOKEN_VERIFIER,
      useExisting: GoogleAuthLibraryVerifier,
    },
  ],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
