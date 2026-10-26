import { ValidationPipe } from '@nestjs/common';

/** Shared by bootstrap and real HTTP tests; keep validation semantics identical. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}
