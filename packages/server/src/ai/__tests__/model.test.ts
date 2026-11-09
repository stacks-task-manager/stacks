// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
import { generateText, streamText } from "ai";
import { createLlmModel, LLM_GENERATION_SETTINGS } from "../model";
const config = {
    baseURL: "http://test.invalid/v1",
    modelId: "qwen-test",
    apiKey: "test",
    disableThinking: true,
};
const completion = {
    id: "test",
    created: 1,
    model: "qwen-test",
    choices: [{ index: 0, message: { role: "assistant", content: "Hello" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

describe("shared model thinking configuration", () => {
    it.each(["generate", "stream"])("serializes shared sampling settings for %s", async mode => {
        const chunk = {
            id: "test",
            created: 1,
            model: "test",
            choices: [{ index: 0, delta: { role: "assistant", content: "Hello" }, finish_reason: "stop" }],
        };
        const fetchMock = vi.fn(async () =>
            mode === "generate"
                ? new Response(JSON.stringify(completion), {
                      headers: { "content-type": "application/json" },
                  })
                : new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
                      headers: { "content-type": "text/event-stream" },
                  })
        );
        const options = {
            model: createLlmModel(config, fetchMock),
            ...LLM_GENERATION_SETTINGS,
            prompt: "Hi",
            maxRetries: 0,
        };
        if (mode === "generate") await generateText(options);
        else await streamText(options).consumeStream();
        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(JSON.parse(String(init.body))).toMatchObject({ temperature: 0, parallel_tool_calls: false });
    });
    it.each([true, false])(
        "sends the opt-in template flag for non-streamed requests: %s",
        async disableThinking => {
            const fetchMock = vi.fn(
                async () =>
                    new Response(JSON.stringify(completion), {
                        headers: { "content-type": "application/json" },
                    })
            );
            await generateText({
                model: createLlmModel({ ...config, disableThinking }, fetchMock),
                prompt: "Hi",
                maxRetries: 0,
            });
            const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
            expect(String(url)).toBe("http://test.invalid/v1/chat/completions");
            const body = JSON.parse(String(init.body));
            expect(body.chat_template_kwargs).toEqual(
                disableThinking ? { enable_thinking: false } : undefined
            );
            expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
            expect(new Headers(init.headers).get("authorization")).toBe("Bearer test");
        }
    );
    it("applies the same flag to streamed chat requests", async () => {
        const chunk = {
            id: "test",
            created: 1,
            model: "qwen-test",
            choices: [{ index: 0, delta: { role: "assistant", content: "Hello" }, finish_reason: "stop" }],
        };
        const fetchMock = vi.fn(
            async () =>
                new Response(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`, {
                    headers: { "content-type": "text/event-stream" },
                })
        );
        const result = streamText({ model: createLlmModel(config, fetchMock), prompt: "Hi", maxRetries: 0 });
        expect(await result.text).toBe("Hello");
        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(JSON.parse(String(init.body))).toMatchObject({
            stream: true,
            chat_template_kwargs: { enable_thinking: false },
        });
    });
});

describe("cache policy on actual serialized requests", () => {
    const cacheContext = { scope: "deployment:tenant", stable: "Stable instructions", tools: [] };
    it.each(["generate", "stream"])(
        "sends SDK cache hints for %s without losing generation settings",
        async mode => {
            const fetchMock = vi.fn(async () =>
                mode === "generate"
                    ? new Response(JSON.stringify(completion), {
                          headers: { "content-type": "application/json" },
                      })
                    : new Response(
                          "data: " +
                              JSON.stringify({
                                  id: "test",
                                  created: 1,
                                  model: "test",
                                  choices: [
                                      {
                                          index: 0,
                                          delta: { role: "assistant", content: "Hello" },
                                          finish_reason: "stop",
                                      },
                                  ],
                              }) +
                              "\n\ndata: [DONE]\n\n",
                          { headers: { "content-type": "text/event-stream" } }
                      )
            );
            const options = {
                model: createLlmModel(
                    { ...config, cacheMode: "openai", cacheRetention: "in_memory" },
                    fetchMock,
                    cacheContext
                ),
                ...LLM_GENERATION_SETTINGS,
                prompt: "Hi",
                maxRetries: 0,
            };
            if (mode === "generate") await generateText(options);
            else await streamText(options).consumeStream();
            const body = JSON.parse(
                String((fetchMock.mock.calls[0] as unknown as [unknown, RequestInit])[1].body)
            );
            expect(body).toMatchObject({
                prompt_cache_key: expect.stringMatching(/^stacks-/),
                prompt_cache_retention: "in_memory",
                parallel_tool_calls: false,
                temperature: 0,
                chat_template_kwargs: { enable_thinking: false },
            });
        }
    );
    it("adds modern cache options only for verified/configured support", async () => {
        const fetchMock = vi.fn(
            async () =>
                new Response(JSON.stringify(completion), { headers: { "content-type": "application/json" } })
        );
        await generateText({
            model: createLlmModel(
                { ...config, cacheMode: "openai", cacheProtocol: "modern", cacheRetention: "30m" },
                fetchMock,
                cacheContext
            ),
            system: [
                { role: "system", content: cacheContext.stable },
                { role: "system", content: "Current identity and date" },
            ],
            prompt: "Hi",
            maxRetries: 0,
        });
        const body = JSON.parse(
            String((fetchMock.mock.calls[0] as unknown as [unknown, RequestInit])[1].body)
        );
        expect(body.prompt_cache_options).toEqual({ mode: "implicit", ttl: "30m" });
        expect(body.prompt_cache_retention).toBeUndefined();
        expect(body.messages[0].content).toEqual([
            { type: "text", text: cacheContext.stable, prompt_cache_breakpoint: { mode: "explicit" } },
        ]);
        expect(body.messages[1].content).toBe("Current identity and date");
    });
    it("keeps unknown endpoints compatible without speculative caching fields", async () => {
        const fetchMock = vi.fn(
            async () =>
                new Response(JSON.stringify(completion), { headers: { "content-type": "application/json" } })
        );
        await generateText({
            model: createLlmModel(config, fetchMock, cacheContext),
            prompt: "Hi",
            maxRetries: 0,
        });
        const body = JSON.parse(
            String((fetchMock.mock.calls[0] as unknown as [unknown, RequestInit])[1].body)
        );
        expect(body.prompt_cache_key).toBeUndefined();
        expect(body.prompt_cache_options).toBeUndefined();
        expect(body.prompt_cache_retention).toBeUndefined();
    });
    it("uses one cache key across SDK tool continuations and preserves tool execution", async () => {
        const { tool, stepCountIs, jsonSchema } = await import("ai");
        const execute = vi.fn(async () => ({ count: 1 }));
        const bodies: Record<string, any>[] = [];
        const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
            bodies.push(JSON.parse(String(init?.body)));
            const response =
                bodies.length === 1
                    ? {
                          ...completion,
                          choices: [
                              {
                                  index: 0,
                                  message: {
                                      role: "assistant",
                                      content: null,
                                      tool_calls: [
                                          {
                                              id: "call-1",
                                              type: "function",
                                              function: { name: "lookup", arguments: "{}" },
                                          },
                                      ],
                                  },
                                  finish_reason: "tool_calls",
                              },
                          ],
                      }
                    : {
                          ...completion,
                          usage: { ...completion.usage, prompt_tokens_details: { cached_tokens: 1 } },
                      };
            return new Response(JSON.stringify(response), {
                headers: { "content-type": "application/json" },
            });
        });
        const result = await generateText({
            model: createLlmModel({ ...config, cacheMode: "openai" }, fetchMock, cacheContext),
            ...LLM_GENERATION_SETTINGS,
            system: cacheContext.stable,
            prompt: "Look up the count",
            tools: {
                lookup: tool({
                    description: "Read count",
                    inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
                    execute,
                }),
            },
            stopWhen: stepCountIs(3),
            maxRetries: 0,
        });
        expect(execute).toHaveBeenCalledTimes(1);
        expect(bodies).toHaveLength(2);
        expect(bodies[0].prompt_cache_key).toBeTruthy();
        expect(bodies[1].prompt_cache_key).toBe(bodies[0].prompt_cache_key);
        expect(bodies[1].tools).toEqual(bodies[0].tools);
        expect(bodies[1].messages.some((message: any) => message.role === "tool")).toBe(true);
        expect(result.totalUsage.cachedInputTokens).toBe(1);
    });
});

it("does not retry a provider rejection to negotiate cache support", async () => {
    const fetchMock = vi.fn(
        async () =>
            new Response(
                JSON.stringify({
                    error: { message: "Unsupported prompt_cache_key", type: "invalid_request_error" },
                }),
                { status: 400, headers: { "content-type": "application/json" } }
            )
    );
    await expect(
        generateText({
            model: createLlmModel({ ...config, cacheMode: "openai" }, fetchMock, {
                scope: "tenant",
                stable: "Instructions",
                tools: [],
            }),
            prompt: "Hi",
            maxRetries: 0,
        })
    ).rejects.toThrow("AI_PROMPT_CACHE_MODE=off");
    expect(fetchMock).toHaveBeenCalledTimes(1);
});
