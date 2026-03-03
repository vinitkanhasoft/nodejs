import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface ICacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string;
  condition?: (req: Request) => boolean;
  skipCache?: boolean;
}

export class CacheUtils {
  private static cache = new Map<string, { data: any; expiry: number }>();

  /**
   * Set cache value
   */
  static set(key: string, data: any, ttl: number = 300): void {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get cache value
   */
  static get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Delete cache value
   */
  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists
   */
  static has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache size
   */
  static size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
   */
  static clean(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key from request
   */
  static generateKey(req: Request, prefix: string = ''): string {
    const key = `${prefix}:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
    return key.replace(/[^a-zA-Z0-9:]/g, '_');
  }

  /**
   * Cache middleware
   */
  static middleware(options: ICacheOptions = {}) {
    const { ttl = 300, key, condition, skipCache = false } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      if (skipCache || (condition && !condition(req))) {
        return next();
      }

      const cacheKey = key || this.generateKey(req);
      const cachedData = this.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        CacheUtils.set(cacheKey, data, ttl);
        logger.debug(`Cache set for key: ${cacheKey}`);
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Invalidate cache middleware
   */
  static invalidate(pattern: string | string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const patterns = Array.isArray(pattern) ? pattern : [pattern];
      
      for (const pattern of patterns) {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.delete(key);
            logger.debug(`Cache invalidated for key: ${key}`);
          }
        }
      }
      
      next();
    };
  }

  /**
   * Cache with async function
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Cache multiple values
   */
  static mget<T = any>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  /**
   * Set multiple values
   */
  static mset(values: Record<string, any>, ttl: number = 300): void {
    for (const [key, data] of Object.entries(values)) {
      this.set(key, data, ttl);
    }
  }

  /**
   * Delete multiple values
   */
  static mdel(keys: string[]): void {
    for (const key of keys) {
      this.delete(key);
    }
  }

  /**
   * Get all keys matching pattern
   */
  static keys(pattern?: string): string[] {
    if (!pattern) {
      return Array.from(this.cache.keys());
    }

    const regex = new RegExp(pattern);
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Get cache statistics
   */
  static stats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    // This is a simplified implementation
    // In a real scenario, you'd track hits and misses
    return {
      size: this.cache.size,
      hitRate: 0, // Would be calculated from hit/miss counters
      memoryUsage: 0, // Would be calculated from actual memory usage
    };
  }

  /**
   * Cache warming
   */
  static async warm<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttl: number = 300
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await fetcher(key);
          this.set(key, data, ttl);
          logger.debug(`Cache warmed for key: ${key}`);
        } catch (error) {
          logger.error(`Failed to warm cache for key: ${key}`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Cache with fallback
   */
  static async getWithFallback<T>(
    key: string,
    fetcher: () => Promise<T>,
    fallback: T,
    ttl: number = 300
  ): Promise<T> {
    try {
      return await this.getOrSet(key, fetcher, ttl);
    } catch (error) {
      logger.error(`Cache fetch failed for key: ${key}, using fallback`, error);
      return fallback;
    }
  }

  /**
   * Cache with retry
   */
  static async getWithRetry<T>(
    key: string,
    fetcher: () => Promise<T>,
    retries: number = 3,
    ttl: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    let lastError: Error;
    for (let i = 0; i < retries; i++) {
      try {
        const data = await fetcher();
        this.set(key, data, ttl);
        return data;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Cache with TTL based on data
   */
  static setWithDynamicTTL(key: string, data: any, ttlCalculator: (data: any) => number): void {
    const ttl = ttlCalculator(data);
    this.set(key, data, ttl);
  }

  /**
   * Cache with tags for easy invalidation
   */
  static setWithTags(key: string, data: any, tags: string[], ttl: number = 300): void {
    this.set(key, data, ttl);
    
    // Store tag relationships (simplified implementation)
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        this.set(tagKey, taggedKeys, ttl * 2); // Tags live longer
      }
    }
  }

  /**
   * Invalidate by tag
   */
  static invalidateByTag(tag: string): void {
    const tagKey = `tag:${tag}`;
    const taggedKeys = this.get<string[]>(tagKey) || [];
    
    for (const key of taggedKeys) {
      this.delete(key);
    }
    
    this.delete(tagKey);
  }

  /**
   * Cache with compression (simplified)
   */
  static setCompressed(key: string, data: any, ttl: number = 300): void {
    // In a real implementation, you'd compress the data
    // For now, just store as-is
    this.set(key, data, ttl);
  }

  /**
   * Get compressed data
   */
  static getCompressed<T = any>(key: string): T | null {
    // In a real implementation, you'd decompress the data
    // For now, just return as-is
    return this.get<T>(key);
  }
}

// Auto-clean expired entries every 5 minutes
setInterval(() => {
  CacheUtils.clean();
}, 5 * 60 * 1000);
