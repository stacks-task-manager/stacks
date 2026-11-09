// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { asSchema, type ToolSet } from "ai";
import { createHash } from "node:crypto";

type CacheConfig = {
    baseURL: string;
    modelId: string;
    cacheNamespace?: string;
    cacheMode?: string;
    cacheRetention?: string;
    cacheProtocol?: string;
};
export type PromptCacheContext = {
    scope: string;
    stable: string;
    tools: unknown;
    onUsage?: (usage: unknown) => void;
};

/** Endpoint compatibility is not evidence of support for OpenAI's optional cache fields. */
export function promptCacheSettings(config: CacheConfig, context: PromptCacheContext) {
    const mode = config.cacheMode || "auto";
    if (!["auto", "off", "openai"].includes(mode))
        throw new Error("AI_PROMPT_CACHE_MODE must be auto, off, or openai");
    const protocol = config.cacheProtocol || "auto";
    if (!["auto", "legacy", "modern"].includes(protocol))
        throw new Error("AI_PROMPT_CACHE_PROTOCOL must be auto, legacy, or modern");
    let official = false;
    try {
        const url = new URL(config.baseURL);
        official = url.origin === "https://api.openai.com";
    } catch {
        /* Model configuration will report invalid endpoints. */
    }
    const enabled = mode !== "off" && (official || mode === "openai");
    if (!enabled && config.cacheRetention)
        throw new Error("AI_PROMPT_CACHE_RETENTION requires a supported endpoint and enabled caching");
    const modern =
        protocol === "modern" ||
        (protocol === "auto" &&
            official &&
            /^gpt-(?:[6-9](?:[.-]|$)|5\.[6-9](?:[.-]|$))/.test(config.modelId));
    const retention = config.cacheRetention || undefined;
    if (retention && !(modern ? ["30m"] : ["in_memory", "24h"]).includes(retention))
        throw new Error(
            "AI_PROMPT_CACHE_RETENTION is incompatible with AI_PROMPT_CACHE_PROTOCOL (legacy: in_memory/24h; modern: 30m)"
        );
    const key = enabled
        ? "stacks-" +
          createHash("sha256")
              .update(
                  JSON.stringify([
                      "v1",
                      config.baseURL,
                      config.modelId,
                      config.cacheNamespace || "stacks",
                      context.scope,
                      context.stable,
                      context.tools,
                  ])
              )
              .digest("hex")
              .slice(0, 48)
        : undefined;
    return {
        key,
        retention: enabled && !modern ? (retention as "in_memory" | "24h" | undefined) : undefined,
        modern:
            enabled && modern
                ? { mode: "implicit" as const, ...(retention ? { ttl: retention } : {}) }
                : undefined,
    };
}

export type CacheUsage = { readTokens: number | null; writeTokens: number | null };

/** Use the actual model-facing schema, including chat's reference-name adaptation. */
export function cacheToolDefinitions(tools: ToolSet) {
    return Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        schema: tool.inputSchema ? asSchema(tool.inputSchema).jsonSchema : undefined,
    }));
}

/** Inspect raw provider fields: the SDK normalizes an absent cached_tokens field to zero. */
export function createCacheUsageTracker() {
    const samples: CacheUsage[] = [];
    const tokens = (value: unknown): number | null =>
        typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
    return {
        observe(usage: unknown) {
            const raw = (
                usage as
                    | {
                          raw?: {
                              prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
                              input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
                              cache_creation_input_tokens?: number;
                          };
                      }
                    | undefined
            )?.raw;
            samples.push({
                readTokens: tokens(
                    raw?.prompt_tokens_details?.cached_tokens ?? raw?.input_tokens_details?.cached_tokens
                ),
                writeTokens: tokens(
                    raw?.prompt_tokens_details?.cache_write_tokens ??
                        raw?.input_tokens_details?.cache_write_tokens ??
                        raw?.cache_creation_input_tokens
                ),
            });
        },
        snapshot() {
            const total = (key: "readTokens" | "writeTokens") =>
                !samples.length || samples.some(sample => sample[key] === null)
                    ? null
                    : samples.reduce((sum, sample) => sum + sample[key]!, 0);
            return { readTokens: total("readTokens"), writeTokens: total("writeTokens") };
        },
    };
}

/** Preserve raw usage fields that this SDK version may discard (including cache-write counts). */
export async function observeCacheResponse(response: Response, observe: (usage: unknown) => void) {
    if (!response.ok) return response;
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        try {
            const payload = await response.clone().json();
            observe({ raw: payload.usage });
        } catch {
            observe(undefined);
        }
        return response;
    }
    if (!response.body) {
        observe(undefined);
        return response;
    }
    const decoder = new TextDecoder();
    let pending = "";
    let usage: unknown;
    const inspect = (line: string) => {
        if (!line.startsWith("data:")) return;
        try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.usage) usage = { raw: payload.usage };
        } catch {
            /* Includes the standard [DONE] event. */
        }
    };
    const stream = response.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                pending += decoder.decode(chunk, { stream: true });
                let newline: number;
                while ((newline = pending.indexOf("\n")) !== -1) {
                    inspect(pending.slice(0, newline));
                    pending = pending.slice(newline + 1);
                }
                // Do not retain unbounded malformed event data.
                if (pending.length > 1_048_576) pending = "";
                controller.enqueue(chunk);
            },
            flush() {
                pending += decoder.decode();
                if (pending) inspect(pending);
                observe(usage);
            },
        })
    );
    return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}
