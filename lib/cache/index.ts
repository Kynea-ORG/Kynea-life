import { unstable_cache, revalidateTag } from 'next/cache';

/**
 * Safe wrapper around Next.js `unstable_cache`.
 *
 * In non-Next runtime environments (such as Vitest unit tests where Next's
 * `incrementalCache` is not mounted), calling `unstable_cache` directly throws
 * "Invariant: incrementalCache missing". This wrapper detects test environments
 * and bypasses the cache, executing the callback directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeCache<T extends (...args: any[]) => Promise<any>>(
  cb: T,
  keyParts?: string[],
  options?: {
    revalidate?: number | false;
    tags?: string[];
  }
): T {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return cb;
  }
  return unstable_cache(cb, keyParts, options);
}

/**
 * Safe wrapper around Next.js `revalidateTag`.
 *
 * Next.js 16 requires a second argument ('max' or a CacheLifeConfig object)
 * to avoid deprecation warnings.
 * In environments outside Next.js request/static-generation context (e.g. tests),
 * it silently ignores missing static store errors.
 */
export function safeRevalidateTag(tag: string, profile: string = 'max'): void {
  try {
    revalidateTag(tag, profile);
  } catch {
    // Silently ignore outside Next.js server context (e.g. unit tests)
  }
}
