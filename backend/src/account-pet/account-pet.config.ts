import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Independent of SEP-10: email/Google users may also own a pet. */
@Injectable()
export class AccountPetConfig {
  constructor(private readonly config: ConfigService) {}
  assertEnabled(): void {
    if (this.config.get<string>('ACCOUNT_PET_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('ACCOUNT_PET_DISABLED');
    }
  }
}
