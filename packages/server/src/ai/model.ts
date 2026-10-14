// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { createOpenAI } from "@ai-sdk/openai";
import { getLlmConfig } from "./config";

/** Keep runtime and manual evaluations on the same explicit generation settings. */
export const LLM_GENERATION_SETTINGS = {
    temperature: 0,
    providerOptions: { openai: { parallelToolCalls: false } },
} as const;

/** The OpenAI provider strips unknown options, so add this server extension at the HTTP boundary. */
export function createLlmModel(config = getLlmConfig(), fetchImpl: typeof fetch = globalThis.fetch) {
    const provider = createOpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        fetch: config.disableThinking
            ? async (url, init) => {
                  const body = JSON.parse(String(init?.body));
                  return fetchImpl(url, {
                      ...init,
                      body: JSON.stringify({
                          ...body,
                          chat_template_kwargs: { ...body.chat_template_kwargs, enable_thinking: false },
                      }),
                  });
              }
            : fetchImpl,
    });
    return provider.chat(config.modelId);
}
