// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, describe, expect, it, vi } from "vitest";
import { initializeNeedle, isNeedleReady, planWithNeedle, stopNeedle } from "../needle/runtime";
const tools = [
    {
        name: "createTask",
        description: "Create a task with the given title",
        parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
    },
];
afterAll(stopNeedle);
describe("bundled Needle WASM runtime", () => {
    it("loads the pinned weights and isolates queued conversations", async () => {
        await initializeNeedle();
        expect(isNeedleReady()).toBe(true);
        const [action, unsupported] = await Promise.all([
            planWithNeedle({
                tools,
                system: "date: 2026-10-13",
                inputs: ['Create a task called "Buy milk"'],
            }),
            planWithNeedle({
                tools,
                system: "date: 2026-10-13",
                inputs: ['Create a task called "Read book"'],
            }),
        ]);
        expect(action.response.function_calls[0].name).toBe("createTask");
        expect(String(action.response.function_calls[0].arguments.title).toLowerCase()).toBe("buy milk");
        expect(unsupported.response.function_calls[0].arguments.title).toBe("Read book");
        expect(action.memoryBytes).toBeGreaterThan(0);
    });
    it("can stop and restart a worker without retaining conversation state", async () => {
        await stopNeedle();
        expect(isNeedleReady()).toBe(false);
        await initializeNeedle();
        expect(isNeedleReady()).toBe(true);
        const result = await planWithNeedle({
            tools,
            system: "",
            inputs: ['Create a task called "Clean desk"'],
        });
        expect(result.response.function_calls[0].arguments.title).toBe("Clean desk");
    });
    it("restarts after a worker-reported inference failure", async () => {
        await expect(
            planWithNeedle({
                tools: Array.from({ length: 6 }, () => ({ name: "broken" })),
                system: "",
                inputs: ["test"],
            })
        ).rejects.toThrow();
        expect(isNeedleReady()).toBe(false);
        const result = await planWithNeedle({
            tools,
            system: "",
            inputs: ['Create a task called "After failure"'],
        });
        expect(result.response.function_calls[0].arguments.title).toBe("After failure");
    });
    it("terminates timed-out inference and recovers on the next request", async () => {
        await initializeNeedle();
        vi.useFakeTimers();
        try {
            const pending = planWithNeedle({
                tools,
                system: "",
                inputs: ['Create a task called "Read book"'],
            });
            const rejected = expect(pending).rejects.toThrow("timed out");
            await vi.advanceTimersByTimeAsync(30001);
            await rejected;
            expect(isNeedleReady()).toBe(false);
        } finally {
            vi.useRealTimers();
        }
        const result = await planWithNeedle({
            tools,
            system: "",
            inputs: ['Create a task called "After timeout"'],
        });
        expect(result.response.function_calls[0].arguments.title).toBe("After timeout");
    });
});
