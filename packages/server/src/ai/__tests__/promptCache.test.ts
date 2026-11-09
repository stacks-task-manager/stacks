// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { promptCacheSettings } from "../promptCache";

const base = {
    baseURL: "https://api.openai.com/v1",
    modelId: "gpt-4.1",
    apiKey: "secret",
    disableThinking: false,
};
const context = {
    scope: "deployment:tenant",
    stable: "Instructions",
    tools: { lookup: { description: "Read", schema: {} } },
};
describe("provider prompt caching", () => {
    it("uses stable opaque scoped keys only for supported endpoints", () => {
        const first = promptCacheSettings(base, context);
        expect(first.key).toMatch(/^stacks-[a-f0-9]{48}$/);
        expect(first.key).toBe(promptCacheSettings(base, { ...context }).key);
        expect(first.key).not.toBe(promptCacheSettings(base, { ...context, scope: "other" }).key);
        expect(first.key).not.toBe(promptCacheSettings(base, { ...context, stable: "Changed" }).key);
        expect(first.key).not.toBe(promptCacheSettings(base, { ...context, tools: {} }).key);
        expect(first.key).not.toContain("secret");
        expect(
            promptCacheSettings({ ...base, baseURL: "https://api.openai.com.attacker.invalid/v1" }, context)
                .key
        ).toBeUndefined();
    });
    it("supports explicit compatible providers, disabling hints, and actionable validation", () => {
        expect(
            promptCacheSettings(
                { ...base, baseURL: "http://localhost:1234/v1", cacheMode: "openai" },
                context
            ).key
        ).toBeTruthy();
        expect(promptCacheSettings({ ...base, cacheMode: "off" }, context).key).toBeUndefined();
        expect(() => promptCacheSettings({ ...base, cacheMode: "typo" }, context)).toThrow(
            "AI_PROMPT_CACHE_MODE"
        );
        expect(() =>
            promptCacheSettings({ ...base, baseURL: "http://localhost/v1", cacheRetention: "24h" }, context)
        ).toThrow("AI_PROMPT_CACHE");
    });
    it("keeps retention opt-in and distinguishes modern from legacy options", () => {
        expect(promptCacheSettings(base, context).retention).toBeUndefined();
        expect(promptCacheSettings({ ...base, cacheRetention: "24h" }, context).retention).toBe("24h");
        expect(
            promptCacheSettings({ ...base, modelId: "gpt-6", cacheRetention: "30m" }, context).modern
        ).toEqual({ mode: "implicit", ttl: "30m" });
        expect(() => promptCacheSettings({ ...base, cacheRetention: "forever" }, context)).toThrow();
    });
});

describe("raw provider usage accounting", () => {
    it("does not mistake SDK-normalized zero for reported cache misses", async () => {
        const { createCacheUsageTracker } = await import("../promptCache");
        const tracker = createCacheUsageTracker();
        tracker.observe({ inputTokens: { cacheRead: 0 }, raw: { prompt_tokens: 100 } });
        expect(tracker.snapshot()).toEqual({ readTokens: null, writeTokens: null });
    });
    it("aggregates reported cached tokens across model steps", async () => {
        const { createCacheUsageTracker } = await import("../promptCache");
        const tracker = createCacheUsageTracker();
        for (const cached_tokens of [0, 128])
            tracker.observe({ raw: { prompt_tokens_details: { cached_tokens } } });
        expect(tracker.snapshot()).toEqual({ readTokens: 128, writeTokens: null });
    });
});

describe("raw transport telemetry", () => {
    it("retains streaming cache writes split across network chunks without changing bytes", async () => {
        const { observeCacheResponse, createCacheUsageTracker } = await import("../promptCache");
        const tracker = createCacheUsageTracker();
        const content =
            'data: {"usage":{"prompt_tokens_details":{"cached_tokens":128,"cache_write_tokens":64}}}\r\n\r\ndata: [DONE]\n\n';
        const encoder = new TextEncoder();
        const response = new Response(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(content.slice(0, 30)));
                    controller.enqueue(encoder.encode(content.slice(30)));
                    controller.close();
                },
            }),
            { headers: { "content-type": "text/event-stream" } }
        );
        expect(await (await observeCacheResponse(response, tracker.observe)).text()).toBe(content);
        expect(tracker.snapshot()).toEqual({ readTokens: 128, writeTokens: 64 });
    });
    it("preserves JSON responses and identifies absent telemetry", async () => {
        const { observeCacheResponse, createCacheUsageTracker } = await import("../promptCache");
        const tracker = createCacheUsageTracker();
        const body = JSON.stringify({ usage: { prompt_tokens: 100 } });
        expect(await (await observeCacheResponse(new Response(body), tracker.observe)).text()).toBe(body);
        expect(tracker.snapshot()).toEqual({ readTokens: null, writeTokens: null });
    });
});

it("partitions deployments and treats malformed provider counts as unknown", async () => {
    expect(promptCacheSettings({ ...base, cacheNamespace: "other-deployment" }, context).key).not.toBe(
        promptCacheSettings(base, context).key
    );
    const { createCacheUsageTracker } = await import("../promptCache");
    const tracker = createCacheUsageTracker();
    tracker.observe({ raw: { prompt_tokens_details: { cached_tokens: "128", cache_write_tokens: -1 } } });
    expect(tracker.snapshot()).toEqual({ readTokens: null, writeTokens: null });
});
