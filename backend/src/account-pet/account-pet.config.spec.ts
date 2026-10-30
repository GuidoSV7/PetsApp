import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AccountPetConfig } from './account-pet.config.js';

describe('independent account-pet feature flag', () => {
  it.each([undefined, '', 'false', 'TRUE', '1', ' true ', true])('fails closed for %s', value => {
    const config = new AccountPetConfig(new ConfigService({ ACCOUNT_PET_ENABLED: value, STELLAR_AUTH_ENABLED: 'true' }));
    expect(() => config.assertEnabled()).toThrowError(expect.objectContaining({ response: { statusCode: 503, error: 'Service Unavailable', message: 'ACCOUNT_PET_DISABLED' } }));
  });
  it('accepts literal true without any Stellar signing/Horizon settings', () => {
    expect(() => new AccountPetConfig(new ConfigService({ ACCOUNT_PET_ENABLED: 'true' })).assertEnabled()).not.toThrow();
  });
});
