import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  SHIPENGINE_API_KEY: z.string().optional(),
  MAERSK_API_KEY: z.string().optional(),
  DHL_API_KEY: z.string().optional(),

  SIGIE_USERNAME: z.string().optional(),
  SIGIE_PASSWORD: z.string().optional(),

  CREDENTIALS_ENCRYPTION_KEY: z.string().length(32, 'CREDENTIALS_ENCRYPTION_KEY debe tener exactamente 32 caracteres').optional(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),

  PLAYWRIGHT_HEADLESS: z.string().default('true'),
  PLAYWRIGHT_TIMEOUT: z.string().default('30000'),

  FRONTEND_URL: z.string().optional(),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.errors.map(e => `  ❌ ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error('\n🚨 Variables de entorno inválidas o faltantes:\n' + missing + '\n');
    process.exit(1);
  }

  return result.data;
}

export let env: Env;

export function initEnv() {
  env = validateEnv();
}
