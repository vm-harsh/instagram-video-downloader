import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  YT_DLP_PATH: z.string().default('yt-dlp'),
  COOKIES_PATH: z.string().default('./secrets/cookies.txt'),
  ANALYZE_CACHE_TTL_SECONDS: z.coerce.number().default(600),
  ANALYZE_SYNC_WAIT_MS: z.coerce.number().default(25000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
  DOWNLOAD_RATE_LIMIT_MAX: z.coerce.number().default(20)
});

export const env = envSchema.parse(process.env);
