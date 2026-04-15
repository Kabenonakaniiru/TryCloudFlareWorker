import { config as loadEnv } from 'dotenv';
import type { Config } from 'drizzle-kit';

loadEnv();

export default {
  schema: ['./src/schema.ts'],
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CF_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_DATABASE_ID!,
    token: process.env.CF_D1_API_TOKEN!,
  },
} satisfies Config;
