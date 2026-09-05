import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasCredentials = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasCredentials
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const envPrefix = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

/**
 * Rate limiter para rutas públicas de autenticación (/login, /registro, /confirmar-email, etc.).
 * 20 peticiones por minuto por IP.
 * ephemeralCache bloquea ráfagas repetidas en memoria sin consumir comandos de Upstash Redis.
 */
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: `${envPrefix}:rl:auth`,
      analytics: false,
      ephemeralCache: new Map(),
    })
  : null;

/**
 * Rate limiter para subida de imágenes a Supabase Storage (clases y perfiles).
 * 15 subidas por hora por usuario autenticado.
 */
export const imageUploadRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, '1 h'),
      prefix: `${envPrefix}:rl:image`,
      analytics: false,
      ephemeralCache: new Map(),
    })
  : null;

/**
 * Rate limiter para creación de clases.
 * 20 clases por día por profesor/academia.
 */
export const classCreationRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 d'),
      prefix: `${envPrefix}:rl:class`,
      analytics: false,
      ephemeralCache: new Map(),
    })
  : null;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Ejecuta la verificación de rate limit con política Fail-Open:
 * Si Redis no está configurado, o si la llamada falla por timeout o error de red,
 * se permite la solicitud (success: true) para no degradar la experiencia de usuarios legítimos.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.warn('[RateLimit] Error contactando Upstash Redis, permitiendo petición (fail-open):', err);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
