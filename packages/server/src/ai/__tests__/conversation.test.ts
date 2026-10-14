// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
import {
    consumeChoice,
    groundedHistory,
    createExecutionGuard,
    getConversation,
    issueChoice,
    rememberIds,
} from "../conversation";
const session = () => getConversation("tenant", "user", crypto.randomUUID());
const widget = {
    type: "choice" as const,
    id: "choice",
    question: "Which task?",
    control: "buttons" as const,
    options: [
        { id: "one", label: "First" },
        { id: "two", label: "Second" },
    ],
};
describe("conversation execution boundary", () => {
    it("rejects empty mutation references without issuing confirmation", async () => {
        const s = session();
        const guard = createExecutionGuard(s, "Delete task");
        const execute = vi.fn();
        await expect(
            guard.execute({ toolName: "deleteTask", input: { taskId: "" }, defaultExecute: execute })
        ).rejects.toThrow();
        expect(execute).not.toHaveBeenCalled();
        expect(s.pending).toBeUndefined();
        expect(guard.stopped()).toBe(true);
    });
    it("asks before a mutation, stores exact arguments, and stops parallel calls", async () => {
        const s = session();
        rememberIds(s, { id: "task-1", title: "Buy milk" });
        const guard = createExecutionGuard(s, "Assign myself to Buy milk");
        const execute = vi.fn();
        const input = { taskId: "task-1", assigneeUserIds: ["user"] };
        const output = await guard.execute({ toolName: "updateTask", input, defaultExecute: execute });
        expect(execute).not.toHaveBeenCalled();
        expect(output).toMatchObject({ type: "choice" });
        expect(s.pending?.widget.question).toContain("Buy milk");
        expect(s.pending?.widget.question).toContain("You");
        input.taskId = "changed";
        expect(s.pending?.mutation?.input).toEqual({ taskId: "task-1", assigneeUserIds: ["user"] });
        await expect(
            guard.execute({ toolName: "deleteTask", input, defaultExecute: execute })
        ).rejects.toThrow("Await");
    });
    it("blocks guessed ids before local or MCP execution", async () => {
        const backend = vi.fn();
        const guard = createExecutionGuard(session(), "Delete Buy milk", backend);
        await expect(
            guard.execute({ toolName: "deleteTask", input: { taskId: "invented" }, defaultExecute: vi.fn() })
        ).rejects.toThrow("Resolve");
        expect(backend).not.toHaveBeenCalled();
    });
    it("learns references from authorized read results", async () => {
        const s = session();
        const guard = createExecutionGuard(s, "Move Buy milk to Done");
        await guard.execute({
            toolName: "listTasks",
            input: {},
            defaultExecute: async () => [{ id: "task-1", title: "Buy milk" }],
        });
        expect(s.knownIds.has("task-1")).toBe(true);
        await expect(
            guard.execute({ toolName: "deleteTask", input: { taskId: "task-1" }, defaultExecute: vi.fn() })
        ).resolves.toMatchObject({ type: "choice" });
    });
    it("stops execution after clarification even if the model calls another tool", async () => {
        const s = session();
        const guard = createExecutionGuard(s, "Choose a task");
        await guard.execute({ toolName: "askUserChoice", input: {}, defaultExecute: async () => widget });
        await expect(
            guard.execute({ toolName: "listTasks", input: {}, defaultExecute: vi.fn() })
        ).rejects.toThrow("Await");
    });
    it("rejects forged, multiple single-choice, and replayed replies", () => {
        const s = session();
        const choice = issueChoice(s, widget);
        expect(() => consumeChoice(s, { token: "forged", optionIds: ["one"] })).toThrow("invalid");
        expect(() =>
            consumeChoice(s, { token: choice.pendingActionToken!, optionIds: ["one", "two"] })
        ).toThrow("invalid");
        const reply = { token: choice.pendingActionToken!, optionIds: ["one"] };
        expect(consumeChoice(s, reply).labels).toEqual(["First"]);
        expect(() => consumeChoice(s, reply)).toThrow("invalid");
    });
    it("supports checkbox answers while rejecting duplicate options", () => {
        const s = session();
        const choice = issueChoice(s, { ...widget, control: "checkbox" });
        expect(() =>
            consumeChoice(s, { token: choice.pendingActionToken!, optionIds: ["one", "one"] })
        ).toThrow();
        expect(
            consumeChoice(s, { token: choice.pendingActionToken!, optionIds: ["one", "two"] }).labels
        ).toEqual(["First", "Second"]);
    });
    it("isolates tenants, users, and conversations and expires pending choices", () => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const s = getConversation("a", "u", id, now);
        issueChoice(s, widget);
        expect(getConversation("b", "u", id, now).pending).toBeUndefined();
        expect(getConversation("a", "v", id, now).pending).toBeUndefined();
        expect(getConversation("a", "u", id, now + 1800000).pending).toBeUndefined();
    });
    it("blocks repeated calls and confirmed mutations within the same turn", async () => {
        const s = session();
        const completed = { toolName: "createStack", input: { title: "Todos" } };
        const guard = createExecutionGuard(s, "Create column and task", undefined, completed);
        await expect(guard.execute({ ...completed, defaultExecute: vi.fn() })).rejects.toThrow("Duplicate");
    });
    it("does not turn read errors into remembered successes", async () => {
        const s = session();
        const guard = createExecutionGuard(s, "List projects");
        await expect(
            guard.execute({
                toolName: "listProjects",
                input: {},
                defaultExecute: async () => {
                    throw new Error("Forbidden");
                },
            })
        ).rejects.toThrow("Forbidden");
        expect(s.results).toEqual([]);
    });
    it("rejects ids of the wrong entity type and stops the turn", async () => {
        const s = session();
        const guard = createExecutionGuard(s, "Delete project Website");
        await guard.execute({
            toolName: "listProjects",
            input: {},
            defaultExecute: async () => [{ id: "project-1", title: "Website" }],
        });
        await expect(
            guard.execute({
                toolName: "deleteStack",
                input: { stackId: "project-1" },
                defaultExecute: vi.fn(),
            })
        ).rejects.toThrow("not a stack");
        expect(s.pending).toBeUndefined();
        expect(guard.stopped()).toBe(true);
        expect(guard.failure()).toContain("not a stack");
    });
    it("retains entity kinds in route and related task references", () => {
        const s = session();
        rememberIds(s, { taskId: "task-1", projectId: "project-1" });
        expect(s.knownKinds.get("task-1")?.has("task")).toBe(true);
        expect(s.knownKinds.get("project-1")?.has("project")).toBe(true);
    });
    it("removes unverified assistant ids while preserving user ids and authorized results", () => {
        const s = session();
        const known = "00000000-0000-4000-8000-000000000001";
        const unknown = "99999999-9999-4999-8999-999999999999";
        rememberIds(s, { id: known }, "task");
        const history = groundedHistory(s, [
            { role: "assistant", content: known + " " + unknown },
            { role: "user", content: unknown },
        ]);
        expect(history[0].content).toContain(known);
        expect(history[0].content).not.toContain(unknown);
        expect(history[1].content).toBe(unknown);
    });
});
