import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgresql://pra_user:pra_password@localhost:5432/pra_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  WORKER_CONCURRENCY: z.coerce.number().default(2),
  STORAGE_PATH: z.string().default('./data/uploads'),
  LOG_LEVEL: z.string().default('info'),
  ALLOW_PRIVATE_TARGETS: z.string().optional(),
});

export function getWorkerConfig() {
  return envSchema.parse(process.env);
}