# Caching system

The response cache used by `@stacks/server`. Implementation lives in [`packages/server/src/utils/cache.ts`](../src/utils/cache.ts); this page documents the architecture, configuration, and operational concerns.

> See also: [server onboarding](ONBOARDING.md) for how the cache fits into the request lifecycle, and [`docs/packages/server.md`](../../../docs/packages/server.md) for the server package overview.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Security & Tenant Isolation](#security--tenant-isolation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Cache Utilities](#cache-utilities)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The caching system is a multi-layered, tenant-isolated caching solution designed for high-performance web applications. It provides:

- **In-memory caching** with TTL (Time To Live) and LRU (Least Recently Used) eviction
- **Tenant isolation** for multi-tenant applications
- **Request deduplication** to prevent duplicate API calls
- **ETag support** for efficient cache validation
- **Response size validation** to prevent memory issues
- **Comprehensive logging** and statistics

## Architecture

### Core Components

1. **MemoryCache**: In-memory cache implementation with TTL and LRU eviction
2. **CacheMiddleware**: Hono middleware for automatic response caching
3. **CacheUtils**: Utility functions for cache management
4. **RequestDeduplicator**: Prevents duplicate requests for the same resource
5. **Logger**: Configurable logging for cache events

### Cache Instances

The system provides pre-configured cache instances for different use cases:

```typescript
export const cacheInstances = {
    api: new MemoryCache({ ttl: 5 * 60 * 1000, maxSize: 500 }),      // 5 minutes
    database: new MemoryCache({ ttl: 15 * 60 * 1000, maxSize: 1000 }), // 15 minutes
    static: new MemoryCache({ ttl: 60 * 60 * 1000, maxSize: 200 }),    // 1 hour
    session: new MemoryCache({ ttl: 30 * 60 * 1000, maxSize: 1000 }),  // 30 minutes
};
```

## Security & Tenant Isolation

### Mandatory Tenant ID

The caching system **requires** a tenant ID for all cache operations. This ensures complete data isolation between tenants:

```typescript
if (!userTenant) {
    throw new Error(
        "Cache middleware requires tenant ID to be set in request context (userTenant). This is required for data isolation."
    );
}
```

### Cache Key Structure

Every cache key follows this format:
```
{tenant}:{userId}:{method}:{path}:{query}:{headerHash}
```

Example:
```
tenant-123:user-456:GET:/api/data:{"filter":"active"}:a1b2c3d4
```

### Security Features

- **SHA-256 ETag generation** (replacing MD5 for better security)
- **Tenant validation** prevents anonymous or missing tenant IDs
- **User validation** (configurable) ensures proper user context
- **No cross-tenant access** - tenants cannot access each other's cached data

## Usage

### Basic Middleware Setup

```typescript
import { cacheMiddleware } from './utils/cache';

// Basic usage with default settings
app.use('/api/*', cacheMiddleware());

// Custom configuration (ttl is in seconds when CACHE=true)
app.use('/api/*', cacheMiddleware({
    ttl: 600,                   // 10 minutes
    maxResponseSize: 2 * 1024 * 1024, // 2MB
    enableETag: true,
    logCacheEvents: true,
    requireTenant: true
}));
```

### Setting Request Context

Before using the cache middleware, ensure the request context contains tenant and user information:

```typescript
app.use('*', async (c, next) => {
    // Extract from JWT, session, or headers
    const userTenant = extractTenantFromRequest(c);
    const userId = extractUserFromRequest(c);
    
    c.set('userTenant', userTenant);
    c.set('userId', userId);
    
    await next();
});
```

### Manual Cache Operations

```typescript
import { cacheInstances, CacheUtils } from './utils/cache';

// Get cached data
const cachedData = cacheInstances.api.get('cache-key');

// Set cached data
cacheInstances.api.set('cache-key', data, 300000); // 5 minutes TTL

// Generate cache key
const key = CacheUtils.generateKey(
    'tenant-123',
    'user-456', 
    'GET',
    '/api/data',
    { filter: 'active' },
    { 'accept-language': 'en-US' }
);

// Invalidate tenant data (API response cache)
CacheUtils.invalidateTenant('tenant-123');

// Invalidate user data
CacheUtils.invalidateUser('tenant-123', 'user-456');
```

After mutations, the server calls `invalidateApiCacheForCurrentRequest()` from loaders (tenant-scoped invalidation on `cacheInstances.api`) when `CACHE=true`.

### Routes using response caching

`cacheMiddleware` is applied only to selected read-heavy GET routes (for example: tasks list/detail/segment/count, project detail/stacks/overview, people lists, companies list/detail, timelogs list). Other endpoints are intentionally uncached (search, export, streaming, highly dynamic data).

## Configuration

### CacheMiddlewareOptions

```typescript
interface CacheMiddlewareOptions {
    cache?: MemoryCache<CachedResponseData>;  // Custom cache instance
    ttl?: number;                             // Time to live in seconds (for cached HTTP responses)
    keyGenerator?: (c: Context) => string;    // Custom key generation function
    skipIf?: (c: Context) => boolean;         // Skip caching condition
    maxResponseSize?: number;                 // Maximum response size to cache
    addCacheHeaders?: boolean;                // Add cache-related headers
    enableETag?: boolean;                     // Enable ETag generation
    logCacheEvents?: boolean;                 // Enable cache event logging
    deduplicateRequests?: boolean;            // Enable request deduplication
    requireTenant?: boolean;                  // Require valid tenant context
    anonymousTenant?: string;                 // Fallback tenant (not recommended)
    anonymousUser?: string;                   // Fallback user (not recommended)
}
```

### Cache Options

```typescript
interface CacheOptions {
    ttl?: number;         // Default TTL in milliseconds
    maxSize?: number;     // Maximum number of entries
    checkPeriod?: number; // Cleanup interval in milliseconds
}
```

### Environment Variables

```bash
# HTTP response caching is opt-in: only CACHE=true enables cacheMiddleware and loader invalidation.
# Any other value (including unset) keeps caching off.
CACHE=true
```

## Cache Utilities

### CacheUtils Methods

```typescript
// Generate cache key
CacheUtils.generateKey(tenant, userId, method, path, query, headers)

// Invalidate by pattern
CacheUtils.invalidatePattern(/^tenant-123:.*/, cacheInstances.api)

// Invalidate all tenant data
CacheUtils.invalidateTenant('tenant-123')

// Invalidate specific user data
CacheUtils.invalidateUser('tenant-123', 'user-456')

// Get statistics for all cache instances
CacheUtils.getAllStats()

// Clear all cache instances
CacheUtils.clearAll()

// Cleanup expired entries in all instances
CacheUtils.cleanupAll()
```

### MemoryCache Methods

```typescript
const cache = new MemoryCache({ ttl: 300000, maxSize: 1000 });

// Basic operations
cache.get(key)           // Get value
cache.set(key, value)    // Set value with default TTL
cache.set(key, value, ttl) // Set value with custom TTL
cache.delete(key)        // Delete specific key
cache.clear()            // Clear all entries
cache.has(key)           // Check if key exists

// Information
cache.keys()             // Get all keys
cache.size()             // Get current size
cache.getStats()         // Get cache statistics

// Maintenance
cache.cleanup()          // Remove expired entries
cache.destroy()          // Cleanup and stop timers
```

## Performance Considerations

### Memory Management

- **LRU Eviction**: When cache reaches `maxSize`, least recently used entries are evicted
- **TTL Cleanup**: Expired entries are automatically cleaned up based on `checkPeriod`
- **Response Size Limits**: Large responses (>1MB by default) are not cached

### Request Deduplication

- Prevents multiple identical requests from hitting the backend
- Uses a 30-second timeout to prevent memory leaks
- Automatically retries if deduplicated request fails

### Cache Headers

- **ETag**: SHA-256 based for secure cache validation
- **Cache-Control**: Respects `no-cache` and `no-store` directives
- **Last-Modified**: Tracks when responses were cached

## Troubleshooting

### Common Issues

1. **"Cache middleware requires tenant ID" Error**
   - Ensure `userTenant` is set in request context before cache middleware
   - Check authentication middleware is running before cache middleware

2. **Cache Not Working**
   - Set `CACHE=true` exactly (opt-in; unset means off)
   - Check if response has `Cache-Control: no-cache` header
   - Ensure response status is < 400

3. **Memory Issues**
   - Reduce `maxSize` in cache configuration
   - Lower `maxResponseSize` to exclude large responses
   - Increase cleanup frequency with lower `checkPeriod`

### Debug Logging

Enable cache event logging:

```typescript
app.use('/api/*', cacheMiddleware({
    logCacheEvents: true
}));
```

### Cache Statistics

```typescript
// Get detailed statistics
const stats = CacheUtils.getAllStats();
console.log('Cache Stats:', stats);

// Individual cache stats
const apiStats = cacheInstances.api.getStats();
console.log('API Cache:', apiStats);
```

## Best Practices

### Security

1. **Always require tenant ID** - Never allow anonymous caching in multi-tenant environments
2. **Use strong tenant validation** - Validate tenant IDs against your authentication system
3. **Regular cache cleanup** - Implement periodic cache invalidation for sensitive data

### Performance

1. **Choose appropriate TTL** - Balance between performance and data freshness
2. **Size limits** - Set reasonable `maxSize` and `maxResponseSize` limits
3. **Selective caching** - Use `skipIf` to avoid caching dynamic or user-specific content

### Monitoring

1. **Enable logging** in development and staging environments
2. **Monitor cache hit rates** using `getStats()` methods
3. **Set up alerts** for cache memory usage and error rates

### Cache Invalidation

```typescript
// Invalidate after data updates
app.post('/api/data', async (c) => {
    const result = await updateData(c.req.json());
    
    // Invalidate related cache entries
    const userTenant = c.get('userTenant');
    const userId = c.get('userId');
    CacheUtils.invalidateUser(userTenant, userId);
    
    return c.json(result);
});
```

### Custom Key Generation

```typescript
// Custom key generator for specific routes
const customKeyGenerator = (c: Context): string => {
    const userTenant = c.get('userTenant');
    const userId = c.get('userId');
    const route = c.req.path;
    
    // Include specific headers or query params
    const relevantData = {
        route,
        filter: c.req.query('filter'),
        sort: c.req.query('sort')
    };
    
    return `${userTenant}:${userId}:${createHash('sha256')
        .update(JSON.stringify(relevantData))
        .digest('hex')
        .slice(0, 16)}`;
};

app.use('/api/search/*', cacheMiddleware({
    keyGenerator: customKeyGenerator
}));
```

---

## API Reference

For detailed API documentation, refer to the TypeScript interfaces and JSDoc comments in `/packages/server/src/utils/cache.ts`.