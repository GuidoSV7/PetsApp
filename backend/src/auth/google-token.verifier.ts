import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_TOKEN_VERIFIER = Symbol('GOOGLE_TOKEN_VERIFIER');

export type GoogleIdProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

export interface GoogleTokenVerifier {
  verify(idToken: string): Promise<GoogleIdProfile>;
}

/** Verifies GIS ID tokens against `GOOGLE_CLIENT_ID`. */
@Injectable()
export class GoogleAuthLibraryVerifier implements GoogleTokenVerifier {
  private readonly client: OAuth2Client;
  private readonly audience: string;

  constructor(config: ConfigService) {
    this.audience = (config.get<string>('GOOGLE_CLIENT_ID') ?? '').trim();
    this.client = new OAuth2Client(this.audience || undefined);
  }

  async verify(idToken: string): Promise<GoogleIdProfile> {
    if (!this.audience) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.audience,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Google token missing subject or email');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: (payload.name ?? payload.email.split('@')[0] ?? 'Michi').trim(),
      picture: payload.picture,
    };
  }
}
