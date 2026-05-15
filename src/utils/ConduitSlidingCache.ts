import { ConduitCacheConfig, ConduitCacheEntry } from "../types.js";

/**
 * A sliding-expiry cache with in-flight deduplication.
 *
 * Each cache entry's TTL is reset on every read, meaning entries only expire
 * if they go untouched for `ttlInMS` milliseconds — hence "sliding" window.
 *
 * In-flight tracking prevents duplicate concurrent fetches for the same key.
 *
 * @template T - The type of value stored in the cache.
 */
export class ConduitSlidingCache<T> {
  private cacheMap: Map<string, ConduitCacheEntry<T>>;
  private inFlight: Map<string, boolean>;
  private ttlInMS: number;

  constructor(config: ConduitCacheConfig) {
    this.cacheMap = new Map();
    this.inFlight = new Map();
    this.ttlInMS = config.ttlInMS;
  }

  /**
   * Retrieves a cached value by key, or initializes it via `initFn` if absent.
   *
   * If the key exists in the cache, its expiry is slid forward and the cached
   * value is returned immediately without invoking `initFn`.
   *
   * If a fetch for this key is already in-flight, the pending request is reused
   * and `initFn` is not called again.
   *
   * Otherwise, `initFn` is called to produce the value, which is then cached.
   *
   * @param key - The cache key to look up or populate.
   * @param initFn - A factory function (sync or async) that produces the value if not cached.
   *
   * @returns The cached or freshly initialized value.
   */
  public async touch(key: string, initFn: () => T | Promise<T>): Promise<T> {
    let cacheValue = this.cacheMap.get(key);
    if (cacheValue) {
      cacheValue.expiresAt = this._expiryTime();
      return cacheValue.data;
    }

    if (this.inFlight.get(key) ?? false) {
    }

    let promise = Promise.resolve(initFn()).then((value) => {
      return value;
    });

    this.inFlight.set(key, true);
    return promise;
  }

  /**
   * Computes the expiry timestamp for a new or refreshed cache entry.
   *
   * @returns Absolute expiry time in milliseconds since the Unix epoch.
   */
  private _expiryTime() {
    return this.ttlInMS + Date.now();
  }
}
