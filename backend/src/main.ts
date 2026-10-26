import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import {
  corsBootWarning,
  httpCorsOptions,
} from './config/cors-origins.util.js';
import { configureHttpApp } from './config/http-setup.js';
import { createValidationPipe } from './config/validation-pipe.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: false,
  });

  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );
  app.disable('x-powered-by');
  // Session cookie parsing and TRUST_PROXY (real client IP behind the frontend proxy).
  configureHttpApp(app);
  // Runs onApplicationShutdown hooks (closing the pg pool) on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // CORS is on unless CORS_ENABLED=false. Only NODE_ENV=development reflects
  // the request Origin when CORS_ORIGIN is empty; elsewhere it fails closed.
  const corsWarning = corsBootWarning();
  if (corsWarning) logger.warn(corsWarning);
  const cors = httpCorsOptions();
  if (cors) app.enableCors(cors);

  app.useGlobalPipes(createValidationPipe());

  const port = app.get(ConfigService).get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`PetsApp API listening on http://localhost:${port}`);
}

await bootstrap();
