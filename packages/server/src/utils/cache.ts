// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * In-memory request/response cache.
 *
 * Exports a `MemoryCache` (TTL + LRU + periodic cleanup) plus a `cacheMiddleware`
 * for Hono. Cache keys are tenant-scoped via `requestContext.getCurrentUser()`
 * so data cannot leak across tenants. For multi-instance deployments or anything
 * larger than a single process, swap this out for Redis — the public surface is
 * small on purpose so callers only need `get`/`set`/`delete`/`clear`.
 */
import { Context, Next } from "hono";
import { createHash } from "crypto";
import { translate } from "@stacks/translations";

import { Errors } from "../errors";
import { requestContext } from "../services/requestContext";

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
}

/**
 * Cache configuration options
 */
interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum number of entries
    checkPeriod?: number; // Cleanup interval in milliseconds
}

/**
 * In-memory cache implementation with TTL and LRU eviction
 */
export class MemoryCache<T = any> {
    private cache = new Map<string, CacheEntry<T>>();
    private readonly defaultTTL: number;
    private readonly maxSize: number;
    private readonly checkPeriod: number;
    private cleanupTimer?: NodeJS.Timeout;
    private stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
    };

    constructor(options: CacheOptions = {}) {
        this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
        this.maxSize = options.maxSize || 1000;
        this.checkPeriod = options.checkPeriod || 60 * 1000; // 1 minute default

        if (process.env.NODE_ENV !== "test") {
            this.startCleanup();
        }
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return undefined;
        }

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.stats.misses++;
            return undefined;
        }

        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.stats.hits++;

        return entry.value;
    }

    set(key: string, value: T, ttl?: number): void {
        const now = Date.now();
        const entryTTL = ttl || this.defaultTTL;

        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        const entry: CacheEntry<T> = {
            value,
            timestamp: now,
            ttl: entryTTL,
            accessCount: 0,
            lastAccessed: now,
        };

        this.cache.set(key, entry);
        this.stats.sets++;
    }

    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.deletes++;
        }
        return deleted;
    }

    clear(): void {
        this.cache.clear();
        this.resetStats();
    }

    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    getStats() {
        const hitRate =
            this.stats.hits + this.stats.misses > 0
                ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
                : 0;

        return {
            ...this.stats,
            hitRate: Math.round(hitRate * 100) / 100,
            size: this.cache.size,
            maxSize: this.maxSize,
        };
    }

    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    size(): number {
        return this.cache.size;
    }

    cleanup(): number {
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        return cleaned;
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }

    private isExpired(entry: CacheEntry<T>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    private evictLRU(): void {
        let oldestKey: string | undefined;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    private startCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.checkPeriod);
    }

    private resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
        };
    }
}

/**
 * Global cache instances for different use cases
 */
export const cacheInstances = {
    api: new MemoryCache({ ttl: 5 * 60 * 1000, maxSize: 500 }),
    database: new MemoryCache({ ttl: 15 * 60 * 1000, maxSize: 1000 }),
    static: new MemoryCache({ ttl: 60 * 60 * 1000, maxSize: 200 }),
    session: new MemoryCache({ ttl: 30 * 60 * 1000, maxSize: 1000 }),
};

/**
 * Cached response data structure
 */
interface CachedResponseData {
    data: any;
    contentType: string;
    etag?: string;
    lastModified: string;
    statusCode: number;
    cachedAt: number;
}

/**
 * Cache middleware options
 */
interface CacheMiddlewareOptions {
    cache?: MemoryCache<CachedResponseData>;
    /** Time-to-live for cached responses, in seconds. */
    ttl?: number;
    keyGenerator?: (c: Context) => string;
    skipIf?: (c: Context) => boolean;
    maxResponseSize?: number;
    addCacheHeaders?: boolean;
    enableETag?: boolean;
    logCacheEvents?: boolean;
    deduplicateRequests?: boolean;
    requireTenant?: boolean;
    anonymousTenant?: string;
    anonymousUser?: string;
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Utility class for cache operations
 */
export class CacheUtils {
    static generateKey(
        tenant: string,
        userId: string,
        method: string,
        path: string,
        query: Record<string, any> = {},
        headers: Record<string, string> = {}
    ): string {
        const headerHash = createHash("sha256").update(JSON.stringify(headers)).digest("hex").slice(0, 8);

        return `${tenant}:${userId}:${method}:${path}:${JSON.stringify(query)}:${headerHash}`;
    }

    static invalidatePattern(pattern: string | RegExp, cache: MemoryCache = cacheInstances.api): number {
        const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
        let invalidated = 0;

        for (const key of cache.keys()) {
            if (regex.test(key)) {
                cache.delete(key);
                invalidated++;
            }
        }

        return invalidated;
    }

    static invalidateTenant(tenantId: string, cache: MemoryCache = cacheInstances.api): number {
        const pattern = new RegExp(`^${escapeRegExp(tenantId)}:`);
        return this.invalidatePattern(pattern, cache);
    }

    static invalidateUser(tenantId: string, userId: string, cache: MemoryCache = cacheInstances.api): number {
        const pattern = new RegExp(`^${escapeRegExp(tenantId)}:${escapeRegExp(userId)}:`);
        return this.invalidatePattern(pattern, cache);
    }

    static getAllStats() {
        return {
            api: cacheInstances.api.getStats(),
            database: cacheInstances.database.getStats(),
            static: cacheInstances.static.getStats(),
            session: cacheInstances.session.getStats(),
        };
    }

    static clearAll(): void {
        Object.values(cacheInstances).forEach(cache => cache.clear());
    }

    static cleanupAll(): number {
        return Object.values(cacheInstances).reduce((total, cache) => total + cache.cleanup(), 0);
    }
}

/** HTTP response caching is enabled only when `CACHE=true` in the environment. */
export function isHttpCacheEnabled(): boolean {
    return process.env.CACHE === "true";
}

/**
 * Clears all API response cache entries for a tenant. No-op if HTTP caching is disabled.
 */
export function invalidateApiCacheForTenant(tenantId: string): number {
    if (!isHttpCacheEnabled()) return 0;
    return CacheUtils.invalidateTenant(tenantId, cacheInstances.api);
}

/**
 * Clears API response cache for the current request's tenant when context exists. No-op otherwise.
 */
export function invalidateApiCacheForCurrentRequest(): number {
    if (!isHttpCacheEnabled()) return 0;
    const user = requestContext.getContext()?.user;
    if (!user) return 0;
    return CacheUtils.invalidateTenant(user.tenant, cacheInstances.api);
}

/**
 * Logger utility
 */
class Logger {
    constructor(private enabled: boolean) {}

    info(message: string, ...args: any[]): void {
        if (this.enabled) {
            console.info(`[CACHE INFO] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.enabled) {
            console.warn(`[CACHE WARN] ${message}`, ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        console.error(`[CACHE ERROR] ${message}`, ...args);
    }
}

/**
 * Request deduplication manager
 */
class RequestDeduplicator {
    private pendingRequests = new Map<
        string,
        {
            promise: Promise<CachedResponseData | null>;
            timeout: NodeJS.Timeout;
        }
    >();

    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

    async deduplicate<T>(key: string, executor: () => Promise<T>, logger: Logger): Promise<T> {
        const existing = this.pendingRequests.get(key);

        if (existing) {
            logger.info(`Request deduplication for: ${key}`);
            try {
                await existing.promise;
                // Don't return the result, let the caller handle cache lookup
            } catch (error) {
                logger.warn(`Deduplicated request failed for ${key}, proceeding with new request`);
            }
        }

        const promise = executor();
        const timeout = setTimeout(() => {
            this.pendingRequests.delete(key);
            logger.warn(`Request timeout for key: ${key}`);
        }, this.REQUEST_TIMEOUT);

        this.pendingRequests.set(key, {
            promise: promise as Promise<CachedResponseData | null>,
            timeout,
        });

        try {
            const result = await promise;
            return result;
        } finally {
            const pendingRequest = this.pendingRequests.get(key);
            if (pendingRequest) {
                clearTimeout(pendingRequest.timeout);
                this.pendingRequests.delete(key);
            }
        }
    }
}

/**
 * Enhanced cache middleware for Hono with proper response handling
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
    const {
        cache = cacheInstances.api,
        ttl,
        maxResponseSize = 1024 * 1024, // 1MB
        addCacheHeaders = true,
        enableETag = true,
        logCacheEvents = false,
        deduplicateRequests = true,
        requireTenant = false,
        anonymousTenant = "anonymous",
        anonymousUser = "anonymous",
    } = options;

    const logger = new Logger(logCacheEvents);
    const deduplicator = new RequestDeduplicator();
    const ttlMs = ttl !== undefined ? ttl * 1000 : undefined;

    const defaultKeyGenerator = (c: Context): string => {
        const userTenant = c.get("userTenant");
        const userId = c.get("userId") || anonymousUser;

        // Always require tenant ID for security - no fallback to anonymous
        if (!userTenant) {
            throw Errors.internal(translate("Cache tenant context required"));
        }

        // Optionally require user ID based on configuration
        if (requireTenant && (!userId || userId === anonymousUser)) {
            throw Errors.internal(translate("Cache user context required"));
        }

        const relevantHeaders = {
            "accept-encoding": c.req.header("accept-encoding") || "",
            "accept-language": c.req.header("accept-language") || "",
        };

        return CacheUtils.generateKey(
            userTenant,
            userId,
            c.req.method,
            c.req.path,
            c.req.query(),
            relevantHeaders
        );
    };

    const keyGenerator = options.keyGenerator || defaultKeyGenerator;

    const generateETag = (content: any): string => {
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);
        return `"${createHash("sha256").update(contentStr).digest("hex").slice(0, 32)}"`;
    };

    const shouldCache = (response: Response): boolean => {
        if (response.status >= 400) return false;

        const cacheControl = response.headers.get("cache-control");
        if (cacheControl?.includes("no-cache") || cacheControl?.includes("no-store")) {
            return false;
        }

        return true;
    };

    const getContentSize = (data: any, contentType: string): number => {
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        if (typeof data === "string") {
            return Buffer.byteLength(data, "utf8");
        }
        // For JSON data, estimate size
        return Buffer.byteLength(JSON.stringify(data), "utf8");
    };

    return async (c: Context, next: Next) => {
        if (!isHttpCacheEnabled()) {
            return await next();
        }

        // Check client cache-control
        const clientCacheControl = c.req.header("cache-control");
        if (clientCacheControl?.includes("no-cache") || clientCacheControl?.includes("no-store")) {
            return await next();
        }

        // Skip if condition is met
        if (options.skipIf?.(c)) {
            return await next();
        }

        // Only cache GET and HEAD requests
        if (!["GET", "HEAD"].includes(c.req.method)) {
            return await next();
        }

        try {
            const key = keyGenerator(c);
            const ifNoneMatch = c.req.header("if-none-match");

            // Try cache hit
            const cached = cache.get(key);
            if (cached) {
                logger.info(`Cache HIT: ${key}`);

                // Handle ETag validation
                if (enableETag && ifNoneMatch && cached.etag === ifNoneMatch) {
                    return c.newResponse(null, { status: 304 });
                }

                // Set cache headers
                if (addCacheHeaders) {
                    c.header("X-Cache", "HIT");
                    if (cached.etag && enableETag) {
                        c.header("ETag", cached.etag);
                    }
                    c.header("Last-Modified", cached.lastModified);
                }

                // Set content type
                if (cached.contentType) {
                    c.header("Content-Type", cached.contentType);
                }

                // Return cached response
                if (cached.contentType.includes("application/json")) {
                    return c.json(cached.data, { status: cached.statusCode });
                } else if (cached.contentType.includes("text/")) {
                    return c.text(cached.data, { status: cached.statusCode });
                } else {
                    return c.body(cached.data, { status: cached.statusCode });
                }
            }

            logger.info(`Cache MISS: ${key}`);

            // Execute with optional deduplication
            const executeRequest = async () => {
                await next();

                const response = c.res;
                if (!response || !shouldCache(response)) {
                    return null;
                }

                try {
                    const contentType = response.headers.get("content-type") || "application/octet-stream";
                    const clonedResponse = response.clone();

                    let responseData: any;
                    if (contentType.includes("application/json")) {
                        responseData = await clonedResponse.json();
                    } else if (contentType.includes("text/")) {
                        responseData = await clonedResponse.text();
                    } else {
                        responseData = await clonedResponse.arrayBuffer();
                    }

                    // Check response size
                    const contentSize = getContentSize(responseData, contentType);
                    if (contentSize > maxResponseSize) {
                        logger.info(`Response too large to cache: ${key} (${contentSize} bytes)`);
                        return null;
                    }

                    const cacheEntry: CachedResponseData = {
                        data: responseData,
                        contentType,
                        etag: enableETag ? generateETag(responseData) : undefined,
                        lastModified: new Date().toUTCString(),
                        statusCode: response.status,
                        cachedAt: Date.now(),
                    };

                    cache.set(key, cacheEntry, ttlMs);

                    if (addCacheHeaders) {
                        c.header("X-Cache", "MISS");
                        if (cacheEntry.etag && enableETag) {
                            c.header("ETag", cacheEntry.etag);
                        }
                        c.header("Last-Modified", cacheEntry.lastModified);
                    }

                    logger.info(`Cached response: ${key}`);
                    return cacheEntry;
                } catch (error) {
                    logger.error(`Failed to cache response for ${key}:`, error);
                    return null;
                }
            };

            if (deduplicateRequests) {
                await deduplicator.deduplicate(key, executeRequest, logger);
            } else {
                await executeRequest();
            }
        } catch (error) {
            logger.error("Cache middleware error:", error);
            // Continue without caching on error
            if (!c.res) {
                await next();
            }
        }
    };
}

/**
 * Cleanup function for application shutdown
 */
export const cleanupCaches = (): void => {
    Object.values(cacheInstances).forEach(cache => cache.destroy());
};
