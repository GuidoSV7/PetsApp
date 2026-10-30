import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import { StellarAuthConfig } from './stellar-auth.config.js';

const values = () => ({ STELLAR_AUTH_ENABLED: 'true', STELLAR_AUTH_SIGNING_SECRET: Keypair.random().secret(), STELLAR_AUTH_HMAC_SECRET: 'synthetic-hmac-key-for-tests-only-32-characters', STELLAR_HOME_DOMAIN: 'pets.example', STELLAR_WEB_AUTH_DOMAIN: 'auth.pets.example' });
const config = (v: Record<string,string>) => new StellarAuthConfig(new ConfigService(v));
describe('Stellar auth configuration', () => {
  it('is disabled by default and accepts only explicit true', () => {
    for (const flag of ['', 'false', '1']) expect(() => config({ ...values(), STELLAR_AUTH_ENABLED: flag }).settings()).toThrow('Stellar authentication unavailable');
  });
  it('accepts a dedicated synthetic signer and fixed testnet configuration', () => {
    expect(config(values()).settings()).toMatchObject({ network: 'testnet', passphrase: Networks.TESTNET, horizon: 'https://horizon-testnet.stellar.org' });
  });
  it.each([
    ['STELLAR_NETWORK_PASSPHRASE', Networks.PUBLIC],
    ['STELLAR_HORIZON_URL', 'https://horizon.stellar.org'],
    ['STELLAR_HORIZON_URL', 'http://localhost:8000'],
    ['STELLAR_HOME_DOMAIN', ''], ['STELLAR_WEB_AUTH_DOMAIN', 'evil/path'],
    ['STELLAR_AUTH_HMAC_SECRET', 'short'],
    ['STELLAR_AUTH_SIGNING_SECRET', 'invalid'],
  ])('fails closed without leaking configuration for %s', (key, value) => {
    expect(() => config({ ...values(), [key]: value }).settings()).toThrow('Stellar authentication unavailable');
  });
});
