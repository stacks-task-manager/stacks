// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryCache, CacheUtils } from "../../src/utils/cache";

describe("MemoryCache", () => {
    let cache: MemoryCache<string>;

    beforeEach(() => {
        cache = new MemoryCache<string>({ ttl: 2000, maxSize: 100 });
    });

    afterEach(() => {
        cache.destroy();
    });

    test("sets and gets a value", () => {
        cache.set("key1", "value1");
        expect(cache.get("key1")).toBe("value1");
    });

    test("returns undefined for missing keys", () => {
        expect(cache.get("nonexistent")).toBeUndefined();
    });

    test("deletes a key and returns true", () => {
        cache.set("key1", "value1");
        expect(cache.delete("key1")).toBe(true);
        expect(cache.get("key1")).toBeUndefined();
    });

    test("delete returns false for missing keys", () => {
        expect(cache.delete("nonexistent")).toBe(false);
    });

    test("clears all entries", () => {
        cache.set("a", "1");
        cache.set("b", "2");
        cache.set("c", "3");
        cache.clear();
        expect(cache.size()).toBe(0);
        expect(cache.get("a")).toBeUndefined();
    });

    test("has returns true for existing keys", () => {
        cache.set("key1", "value1");
        expect(cache.has("key1")).toBe(true);
    });

    test("has returns false for expired keys", async () => {
        const shortCache = new MemoryCache<string>({ ttl: 50 });
        shortCache.set("temp", "value");
        expect(shortCache.has("temp")).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(shortCache.has("temp")).toBe(false);
        shortCache.destroy();
    });

    test("respects TTL and expires entries", async () => {
        const shortCache = new MemoryCache<string>({ ttl: 50 });
        shortCache.set("temp", "value");
        expect(shortCache.get("temp")).toBe("value");
        expect(shortCache.has("temp")).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(shortCache.get("temp")).toBeUndefined();
        shortCache.destroy();
    });

    test("respects per-set TTL override", async () => {
        const cache2 = new MemoryCache<string>({ ttl: 5000 });
        cache2.set("short", "value", 50);
        expect(cache2.get("short")).toBe("value");
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(cache2.get("short")).toBeUndefined();
        cache2.destroy();
    });

    test("reports accurate stats", () => {
        cache.set("k1", "v1");
        cache.set("k2", "v2");
        cache.get("k1");
        cache.get("k2");
        cache.get("missing");
        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.sets).toBe(2);
        expect(stats.size).toBe(2);
        expect(stats.hitRate).toBeCloseTo(66.67, 0);
    });

    test("evicts when maxSize is reached even when Date.now() is identical for all entries", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));

        const tinyCache = new MemoryCache<string>({ maxSize: 3 });
        tinyCache.set("a", "1");
        tinyCache.set("b", "2");
        tinyCache.set("c", "3");
        expect(tinyCache.size()).toBe(3);

        tinyCache.set("d", "4");
        expect(tinyCache.size()).toBe(3);
        expect(tinyCache.getStats().evictions).toBe(1);
        expect(tinyCache.get("d")).toBe("4");

        tinyCache.destroy();
        vi.useRealTimers();
    });

    test("does not evict when replacing existing key", () => {
        const tinyCache = new MemoryCache<string>({ maxSize: 1 });
        tinyCache.set("a", "1");
        tinyCache.set("a", "updated"); // should replace, not evict
        expect(tinyCache.get("a")).toBe("updated");
        expect(tinyCache.size()).toBe(1);
    });

    test("keys returns all non-expired keys", () => {
        cache.set("x", "1");
        cache.set("y", "2");
        const keys = cache.keys();
        expect(keys).toContain("x");
        expect(keys).toContain("y");
        expect(keys.length).toBe(2);
    });

    test("cleanup removes expired entries", async () => {
        const shortCache = new MemoryCache<string>({ ttl: 50 });
        shortCache.set("live", "1");
        await new Promise(resolve => setTimeout(resolve, 80));
        shortCache.set("dead", "2");
        const cleaned = shortCache.cleanup();
        expect(cleaned).toBe(1);
        expect(shortCache.get("live")).toBeUndefined();
        expect(shortCache.get("dead")).toBe("2");
        shortCache.destroy();
    });

    test("destroy clears all entries", () => {
        const cache2 = new MemoryCache<string>({ maxSize: 100 });
        cache2.set("a", "1");
        expect(cache2.size()).toBe(1);
        cache2.destroy();
        expect(cache2.size()).toBe(0);
    });
});

describe("CacheUtils", () => {
    test("generateKey creates a deterministic cache key", () => {
        const key = CacheUtils.generateKey("tenant-1", "user-1", "GET", "/api/tasks", {}, {});
        expect(key).toContain("tenant-1");
        expect(key).toContain("user-1");
        expect(key).toContain("GET");
        expect(key).toContain("/api/tasks");
    });

    test("generateKey includes query string", () => {
        const key1 = CacheUtils.generateKey("t", "u", "GET", "/tasks", { limit: "10" }, {});
        const key2 = CacheUtils.generateKey("t", "u", "GET", "/tasks", { limit: "20" }, {});
        expect(key1).not.toBe(key2);
    });

    test("generateKey includes header hash", () => {
        const key1 = CacheUtils.generateKey("t", "u", "GET", "/tasks", {}, { accept: "text/html" });
        const key2 = CacheUtils.generateKey("t", "u", "GET", "/tasks", {}, { accept: "application/json" });
        expect(key1).not.toBe(key2);
    });

    test("invalidateTenant removes matching keys", () => {
        const cache = new MemoryCache<string>({ maxSize: 1000 });
        cache.set("tenant-1:user-1:GET:/tasks", "data1");
        cache.set("tenant-1:user-2:GET:/projects", "data2");
        cache.set("tenant-2:user-1:GET:/tasks", "data3");
        const invalidated = CacheUtils.invalidateTenant("tenant-1", cache);
        expect(invalidated).toBe(2);
        expect(cache.size()).toBe(1);
    });

    test("invalidateUser removes matching keys only", () => {
        const cache = new MemoryCache<string>({ maxSize: 1000 });
        cache.set("tenant-1:user-1:GET:/tasks", "data1");
        cache.set("tenant-1:user-2:GET:/tasks", "data2");
        const invalidated = CacheUtils.invalidateUser("tenant-1", "user-1", cache);
        expect(invalidated).toBe(1);
        expect(cache.size()).toBe(1);
    });

    test("invalidatePattern with regex", () => {
        const cache = new MemoryCache<string>({ maxSize: 1000 });
        cache.set("tenant:user:GET:/tasks", "data1");
        cache.set("tenant:user:GET:/projects", "data2");
        cache.set("tenant:user:POST:/tasks", "data3");
        const invalidated = CacheUtils.invalidatePattern(/GET:/, cache);
        expect(invalidated).toBe(2);
        expect(cache.size()).toBe(1);
    });

    test("getAllStats returns stats for all cache instances", () => {
        const stats = CacheUtils.getAllStats();
        expect(stats).toHaveProperty("api");
        expect(stats).toHaveProperty("database");
        expect(stats).toHaveProperty("static");
        expect(stats).toHaveProperty("session");
    });

    test("handles null/undefined values", () => {
        const cache = new MemoryCache<string | null>({ maxSize: 100 });
        cache.set("null-key", null);
        cache.set("undefined-key", undefined as unknown as string);
        expect(cache.get("null-key")).toBeNull();
        expect(cache.get("undefined-key")).toBeUndefined();
    });

    test("handles object values", () => {
        const cache = new MemoryCache<{ name: string }>({ maxSize: 100 });
        const obj = { name: "test" };
        cache.set("obj", obj);
        expect(cache.get("obj")?.name).toBe("test");
    });

    test("size returns correct count", () => {
        const cache = new MemoryCache<string>({ maxSize: 100 });
        expect(cache.size()).toBe(0);
        cache.set("a", "1");
        cache.set("b", "2");
        expect(cache.size()).toBe(2);
    });
});
