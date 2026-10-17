import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';
import { drizzleCredentialsForCommand } from './src/database/drizzle-credentials.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const credentials = drizzleCredentialsForCommand(process.argv, process.env);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(credentials ? { dbCredentials: credentials } : {}),
});
