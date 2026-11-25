import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { Pool } from 'pg';
import { Public } from './auth/decorators/public.decorator.js';
import { PG_POOL } from './database/database.tokens.js';

@Controller()
export class AppController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Liveness probe for the proxy and the container platform. */
  @Get()
  @Public()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness probe: answers ok only while the database accepts `SELECT 1`. */
  @Get('health/ready')
  @Public()
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await this.pool.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok' };
  }
}
