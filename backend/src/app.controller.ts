import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator.js';

@Controller()
export class AppController {
  /** Liveness probe for the proxy and the container platform. */
  @Get()
  @Public()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
