// Fallback-ready Memory Cache Driver
const localCache = new Map<string, { value: string; expiresAt: number }>()

/**
 * Standard get-or-set caching wrapper.
 * Checks for keys, runs fetch callback if missing, and saves to cache.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFunction: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const cached = localCache.get(key)

  if (cached && cached.expiresAt > now) {
    console.log(`[CACHE HIT] Key: "${key}" resolved from in-memory store.`)
    return JSON.parse(cached.value) as T
  }

  console.log(`[CACHE MISS] Key: "${key}" executing fetch query...`)
  const freshData = await fetchFunction()
  
  localCache.set(key, {
    value: JSON.stringify(freshData),
    expiresAt: now + (ttlSeconds * 1000),
  })

  return freshData
}

/**
 * Purge cache key.
 */
export function purgeCache(key: string): void {
  localCache.delete(key)
  console.log(`[CACHE PURGE] Key: "${key}" deleted.`)
}

/**
 * Clear complete cache contents.
 */
export function clearCache(): void {
  localCache.clear()
  console.log(`[CACHE CLEAR] All keys evicted.`)
}
