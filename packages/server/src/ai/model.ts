// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { wrapLanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { promptCacheSettings, observeCacheResponse, type PromptCacheContext } from "./promptCache";
import { getLlmConfig } from "./config";

/** Keep runtime and manual evaluations on the same explicit generation settings. */
export const LLM_GENERATION_SETTINGS = {
    temperature: 0,
    providerOptions: { openai: { parallelToolCalls: false } },
} as const;

/** The OpenAI provider strips unknown options, so add this server extension at the HTTP boundary. */
export function createLlmModel(
    config: {
        baseURL: string;
        modelId: string;
        apiKey: string;
        disableThinking: boolean;
        cacheNamespace?: string;
        cacheMode?: string;
        cacheRetention?: string;
        cacheProtocol?: string;
    } = getLlmConfig(),
    fetchImpl: typeof fetch = globalThis.fetch,
    cacheContext?: PromptCacheContext
) {
    // Validate before any model request or tool execution.
    const cache = promptCacheSettings(config, cacheContext ?? { scope: "unscoped", stable: "", tools: {} });
    const provider = createOpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        fetch: async (url, init) => {
            let request = init;
            if (config.disableThinking || (cacheContext && cache.modern)) {
                const body = JSON.parse(String(init?.body));
                request = {
                    ...init,
                    body: JSON.stringify({
                        ...body,
                        ...(config.disableThinking
                            ? {
                                  chat_template_kwargs: {
                                      ...body.chat_template_kwargs,
                                      enable_thinking: false,
                                  },
                              }
                            : {}),
                        ...(cacheContext && cache.modern
                            ? {
                                  prompt_cache_options: cache.modern,
                                  messages: body.messages.map((message: { role: string; content: unknown }) =>
                                      ["system", "developer"].includes(message.role) &&
                                      message.content === cacheContext.stable
                                          ? {
                                                ...message,
                                                content: [
                                                    {
                                                        type: "text",
                                                        text: message.content,
                                                        prompt_cache_breakpoint: { mode: "explicit" },
                                                    },
                                                ],
                                            }
                                          : message
                                  ),
                              }
                            : {}),
                    }),
                };
            }
            const response = await fetchImpl(url, request);
            if (response.status === 400 && cache.key) {
                let message = "";
                try {
                    message = String((await response.clone().json()).error?.message ?? "");
                } catch {
                    /* Preserve other provider errors. */
                }
                if (/prompt_cache|promptCache/.test(message))
                    throw new Error(
                        "Provider rejected prompt caching settings. Set AI_PROMPT_CACHE_MODE=off or configure supported AI_PROMPT_CACHE_PROTOCOL and AI_PROMPT_CACHE_RETENTION values. No request was replayed."
                    );
            }
            return cacheContext?.onUsage ? observeCacheResponse(response, cacheContext.onUsage) : response;
        },
    });
    const model = provider.chat(config.modelId);
    if (!cacheContext) return model;
    return wrapLanguageModel({
        model,
        middleware: {
            specificationVersion: "v3",
            transformParams: async ({ params }) => ({
                ...params,
                providerOptions: {
                    ...params.providerOptions,
                    openai: {
                        ...params.providerOptions?.openai,
                        ...(cache.key ? { promptCacheKey: cache.key } : {}),
                        ...(cache.retention ? { promptCacheRetention: cache.retention } : {}),
                    },
                },
            }),
        },
    });
}
