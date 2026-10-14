// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
import { generateText, streamText } from "ai";
import { createLlmModel } from "../model";
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
