import { ConfigService } from '@nestjs/config';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Keypair, Networks } from '@stellar/stellar-sdk';

export interface StellarAuthSettings {
  network: 'testnet';
  passphrase: string;
  horizon: string;
  homeDomain: string;
  webAuthDomain: string;
  signer: Keypair;
  hmacSecret: string;
}

@Injectable()
export class StellarAuthConfig {
  constructor(private readonly config: ConfigService) {}
  settings(): StellarAuthSettings {
    if (this.config.get<string>('STELLAR_AUTH_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('Stellar authentication unavailable');
    }
    try {
      const passphrase = this.config.get<string>('STELLAR_NETWORK_PASSPHRASE') ?? Networks.TESTNET;
      const horizon = this.config.get<string>('STELLAR_HORIZON_URL') ?? 'https://horizon-testnet.stellar.org';
      const homeDomain = this.config.get<string>('STELLAR_HOME_DOMAIN') ?? '';
      const webAuthDomain = this.config.get<string>('STELLAR_WEB_AUTH_DOMAIN') ?? '';
      const hmacSecret = this.config.get<string>('STELLAR_AUTH_HMAC_SECRET') ?? '';
      const domain = /^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
      if (passphrase !== Networks.TESTNET || horizon !== 'https://horizon-testnet.stellar.org' ||
          !domain.test(homeDomain) || !domain.test(webAuthDomain) || hmacSecret.length < 32) throw new Error('invalid configuration');
      return { network: 'testnet', passphrase, horizon, homeDomain, webAuthDomain, hmacSecret,
        signer: Keypair.fromSecret(this.config.get<string>('STELLAR_AUTH_SIGNING_SECRET') ?? '') };
    } catch {
      // Never include configuration values or the SDK's secret parsing error.
      throw new ServiceUnavailableException('Stellar authentication unavailable');
    }
  }
}
