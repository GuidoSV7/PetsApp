import { HttpException } from '@nestjs/common';

export class StellarRateLimitException extends HttpException {
  constructor(readonly retryAfter: number) {
    super('Stellar challenge limit reached', 429);
  }
}
