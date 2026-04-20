import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://pra_user:pra_password@localhost:5432/pra_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  STORAGE_PATH: z.string().default('./data/uploads'),
  LOG_LEVEL: z.string().default('info'),
  DEMO_EMAIL: z.string().default('demo@pra.local'),
  DEMO_PASSWORD: z.string().default('demo-password'),
  ALLOW_PRIVATE_TARGETS: z.string().optional(),
  INLINE_SCANS: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function getConfig(): AppConfig {
  return envSchema.parse(process.env);
}