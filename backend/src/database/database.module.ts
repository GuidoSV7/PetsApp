import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { schema } from '../db/schema.js';
import { DRIZZLE, PG_POOL } from './database.tokens.js';
import { parsePositiveInt } from '../config/parse-positive-int.js';
import { resolveDrizzleCredentials } from './drizzle-credentials.js';

export type DrizzleDb = NodePgDatabase<typeof schema>;

const DEFAULT_POOL_MAX = 10;
// Without a connect timeout pg waits forever when the database is unreachable.
const DEFAULT_CONNECTION_TIMEOUT_MS = 5000;

@Injectable()
export class DatabasePoolShutdown implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): pg.Pool => {
        const { url, ssl } = resolveDrizzleCredentials({
          DATABASE_URL: config.get<string>('DATABASE_URL'),
          PROD: config.get<string>('PROD'),
          DATABASE_SSL: config.get<string>('DATABASE_SSL'),
          DATABASE_SSL_CA: config.get<string>('DATABASE_SSL_CA'),
          DATABASE_SSL_REJECT_UNAUTHORIZED: config.get<string>(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
          ),
        });
        return new pg.Pool({
          connectionString: url,
          ssl,
          max: parsePositiveInt(config.get('DB_POOL_MAX'), DEFAULT_POOL_MAX),
          connectionTimeoutMillis: parsePositiveInt(
            config.get('DB_CONNECTION_TIMEOUT_MS'),
            DEFAULT_CONNECTION_TIMEOUT_MS,
          ),
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): DrizzleDb => drizzle(pool, { schema }),
    },
    DatabasePoolShutdown,
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule {}
