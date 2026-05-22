// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Test suite for cache tenant isolation
 * 
 * This test verifies that the cache system properly isolates data between
 * different tenants and users to prevent data leakage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    MemoryCache,
    CacheUtils,
    cacheInstances,
    isHttpCacheEnabled,
    invalidateApiCacheForTenant,
} from '../cache';

describe('Cache Tenant Isolation', () => {
    let cache: MemoryCache;

    beforeEach(() => {
        cache = new MemoryCache({ ttl: 60000, maxSize: 100 });
    });

    describe('CacheUtils.generateKey', () => {
        it('should generate tenant-aware keys', () => {
            const key1 = CacheUtils.generateKey('tenant1', 'user1', 'GET', '/endpoint');
            const key2 = CacheUtils.generateKey('tenant2', 'user1', 'GET', '/endpoint');
            const key3 = CacheUtils.generateKey('tenant1', 'user2', 'GET', '/endpoint');

            const parts1 = key1.split(':');
            expect(parts1[0]).toBe('tenant1');
            expect(parts1[1]).toBe('user1');
            expect(parts1[2]).toBe('GET');
            expect(parts1[3]).toBe('/endpoint');
            expect(parts1[4]).toBe('{}');
            expect(parts1[5].length).toBe(8);

            expect(key1).not.toBe(key2);
            expect(key1).not.toBe(key3);
            expect(key2).not.toBe(key3);
        });

        it('should fallback to anonymous for missing tenant/user', () => {
            const key = CacheUtils.generateKey('anonymous', 'anonymous', 'GET', '/endpoint');
            const parts = key.split(':');
            expect(parts[0]).toBe('anonymous');
            expect(parts[1]).toBe('anonymous');
            expect(parts[2]).toBe('GET');
            expect(parts[3]).toBe('/endpoint');
        });

        it('should include query and header signature', () => {
            const key = CacheUtils.generateKey('tenant', 'user', 'GET', '/endpoint', { id: 123 });
            expect(key.includes('{"id":123}')).toBe(true);
            const hash = key.split(':').pop()!;
            expect(hash.length).toBe(8);
        });
    });

    describe('Cache Isolation', () => {
        it('should isolate data between different tenants', () => {
            // Set data for tenant1
            cache.set('tenant1:user1:api:data', { message: 'tenant1 data' });
            // Set data for tenant2 with same endpoint
            cache.set('tenant2:user1:api:data', { message: 'tenant2 data' });

            // Each tenant should get their own data
            const tenant1Data = cache.get('tenant1:user1:api:data');
            const tenant2Data = cache.get('tenant2:user1:api:data');

            expect(tenant1Data).toEqual({ message: 'tenant1 data' });
            expect(tenant2Data).toEqual({ message: 'tenant2 data' });
        });

        it('should isolate data between different users in same tenant', () => {
            // Set data for user1
            cache.set('tenant1:user1:api:profile', { name: 'User 1' });
            // Set data for user2 in same tenant
            cache.set('tenant1:user2:api:profile', { name: 'User 2' });

            // Each user should get their own data
            const user1Data = cache.get('tenant1:user1:api:profile');
            const user2Data = cache.get('tenant1:user2:api:profile');

            expect(user1Data).toEqual({ name: 'User 1' });
            expect(user2Data).toEqual({ name: 'User 2' });
        });
    });

    describe('Cache Invalidation', () => {
        beforeEach(() => {
            // Set up test data
            cache.set('tenant1:user1:api:data1', 'data1');
            cache.set('tenant1:user1:api:data2', 'data2');
            cache.set('tenant1:user2:api:data1', 'data3');
            cache.set('tenant2:user1:api:data1', 'data4');
            cache.set('tenant2:user2:api:data1', 'data5');
        });

        it('should invalidate all entries for a specific tenant', () => {
            const invalidated = CacheUtils.invalidateTenant('tenant1', cache);
            
            expect(invalidated).toBe(3); // 3 entries for tenant1
            expect(cache.get('tenant1:user1:api:data1')).toBeUndefined();
            expect(cache.get('tenant1:user1:api:data2')).toBeUndefined();
            expect(cache.get('tenant1:user2:api:data1')).toBeUndefined();
            
            // tenant2 data should remain
            expect(cache.get('tenant2:user1:api:data1')).toBe('data4');
            expect(cache.get('tenant2:user2:api:data1')).toBe('data5');
        });

        it('should invalidate all entries for a specific user', () => {
            const invalidated = CacheUtils.invalidateUser('tenant1', 'user1', cache);
            
            expect(invalidated).toBe(2); // 2 entries for tenant1:user1
            expect(cache.get('tenant1:user1:api:data1')).toBeUndefined();
            expect(cache.get('tenant1:user1:api:data2')).toBeUndefined();
            
            // Other users' data should remain
            expect(cache.get('tenant1:user2:api:data1')).toBe('data3');
            expect(cache.get('tenant2:user1:api:data1')).toBe('data4');
            expect(cache.get('tenant2:user2:api:data1')).toBe('data5');
        });
    });

    describe('isHttpCacheEnabled', () => {
        const prev = process.env.CACHE;

        afterEach(() => {
            process.env.CACHE = prev;
        });

        it('returns true only when CACHE is exactly "true"', () => {
            process.env.CACHE = 'true';
            expect(isHttpCacheEnabled()).toBe(true);
            process.env.CACHE = 'false';
            expect(isHttpCacheEnabled()).toBe(false);
            delete process.env.CACHE;
            expect(isHttpCacheEnabled()).toBe(false);
        });
    });

    describe('invalidateApiCacheForTenant', () => {
        const api = cacheInstances.api;

        it('is a no-op when HTTP cache is disabled', () => {
            const prev = process.env.CACHE;
            process.env.CACHE = 'false';
            api.set('t1:user1:GET:/x:{}:abcd1234', 'v');
            expect(invalidateApiCacheForTenant('t1')).toBe(0);
            expect(api.get('t1:user1:GET:/x:{}:abcd1234')).toBe('v');
            api.delete('t1:user1:GET:/x:{}:abcd1234');
            process.env.CACHE = prev;
        });

        it('invalidates tenant keys when HTTP cache is enabled', () => {
            const prev = process.env.CACHE;
            process.env.CACHE = 'true';
            api.set('t1:user1:GET:/x:{}:abcd1234', 'v');
            api.set('t2:user1:GET:/x:{}:abcd1234', 'w');
            expect(invalidateApiCacheForTenant('t1')).toBe(1);
            expect(api.get('t1:user1:GET:/x:{}:abcd1234')).toBeUndefined();
            expect(api.get('t2:user1:GET:/x:{}:abcd1234')).toBe('w');
            api.clear();
            process.env.CACHE = prev;
        });
    });
});