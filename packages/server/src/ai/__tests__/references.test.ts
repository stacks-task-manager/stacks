// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { referenceNameSchema } from "../referenceInput";
import { resolveReferences } from "../references";
import { mutationSummary } from "../results";
import { createExecutionGuard, getConversation, consumeChoice } from "../conversation";
vi.mock("../../loaders", () => ({}));
vi.mock("../../loaders/context", () => ({ getCurrentUser: () => ({ id: "user" }) }));
const projectId = "00000000-0000-4000-8000-000000000001";
const taskId = "00000000-0000-4000-8000-000000000002";
const stackId = "00000000-0000-4000-8000-000000000003";
const session = () => getConversation("tenant", "user", crypto.randomUUID());
const names = { resolveReferenceNames: true };
describe("server-managed references", () => {
    it("resolves relative column placement before immediate execution", async () => {
        const s = session();
        const backend = vi.fn(async (args: { toolName: string }) =>
            args.toolName === "listStacks"
                ? [{ id: stackId, title: "Drafts", projectId }]
                : { id: taskId, title: "Test", projectId }
        );
        const action = vi.fn();
        const guard = createExecutionGuard(
            s,
            'add a new column named "Test" in front of "Drafts"',
            backend,
            undefined,
            { ...names, projectId }
        );
        await guard.execute({
            toolName: "createStack",
            input: { projectId, title: "Test", beforeStackId: "Drafts" },
            defaultExecute: action,
        });
        expect(backend).toHaveBeenLastCalledWith(
            expect.objectContaining({
                toolName: "createStack",
                input: { projectId, title: "Test", beforeStackId: stackId },
            })
        );
        expect(s.pending).toBeUndefined();
        expect(guard.summary()).toBe("Column created: Test.");
        expect(action).not.toHaveBeenCalled();
    });
    it("resolves the authenticated 'me' alias without a directory lookup", async () => {
        const lookup = vi.fn();
        const result = await resolveReferences(
            { assigneeUserIds: ["me"] },
            new Set([taskId]),
            lookup,
            taskId
        );
        expect(result.input).toEqual({ assigneeUserIds: [taskId] });
        expect(lookup).not.toHaveBeenCalled();
    });
    it("resolves tag names supplied as tagIds and statusTagIds through listTags", async () => {
        const tagId = "00000000-0000-4000-8000-00000000000a";
        const statusId = "00000000-0000-4000-8000-00000000000c";
        const lookup = vi.fn(async (name: string) =>
            name === "listTags"
                ? [
                      { id: tagId, title: "Bug" },
                      { id: statusId, title: "In Progress" },
                  ]
                : []
        );
        const result = await resolveReferences(
            { tagIds: ["Bug"], statusTagIds: ["In Progress"] },
            new Set<string>(),
            lookup,
            undefined
        );
        expect(result.input).toEqual({ tagIds: [tagId], statusTagIds: [statusId] });
        expect(lookup).toHaveBeenCalledWith("listTags", expect.anything());
    });
    it("accepts names in chat while retaining execution validation and unrelated constraints", () => {
        const schema = z
            .object({ taskId: z.string().uuid(), progress: z.number().max(100) })
            .refine(input => input.progress >= 0);
        const chat = referenceNameSchema(schema);
        expect(chat.parse({ taskId: "Buy milk", progress: 20 })).toEqual({
            taskId: "Buy milk",
            progress: 20,
        });
        expect(schema.safeParse({ taskId: "Buy milk", progress: 20 }).success).toBe(false);
        for (const progress of [-1, 150])
            expect(chat.safeParse({ taskId: "Buy milk", progress }).success).toBe(false);
    });
    it("resolves 'delete the Temp column' to its UUID within the current project", async () => {
        const s = session();
        const backend = vi.fn(async (args: { toolName: string; input: unknown }) => {
            expect(args.toolName).toBe("listStacks");
            expect(args.input).toEqual({ projectId });
            return [{ id: stackId, title: "Temp", projectId }];
        });
        const action = vi.fn();
        const guard = createExecutionGuard(s, "delete the Temp column", backend, undefined, {
            ...names,
            projectId,
        });
        const output = (await guard.execute({
            toolName: "deleteStack",
            input: { stackId: "Temp" },
            defaultExecute: action,
        })) as any;
        expect(s.pending?.mutation?.input).toEqual({ stackId });
        expect(output.question).toContain('Column: "Temp"');
        expect(output.question).not.toContain("stack Id");
        expect(action).not.toHaveBeenCalled();
    });
    it("never treats a remembered literal column name as an executable id", async () => {
        const s = session();
        s.knownIds.add("Temp");
        s.knownKinds.set("Temp", new Set(["stack"]));
        const guard = createExecutionGuard(s, "delete the Temp column", undefined, undefined, names);
        await expect(
            guard.execute({ toolName: "deleteStack", input: { stackId: "Temp" }, defaultExecute: vi.fn() })
        ).rejects.toThrow("not a resolved id");
        expect(s.pending).toBeUndefined();
    });
    it("resolves exact project names before executing validated arguments", async () => {
        const s = session();
        const backend = vi.fn(async (args: { toolName: string }) =>
            args.toolName === "listProjects"
                ? [{ id: projectId, title: "Website" }]
                : { id: stackId, title: "Review", projectId }
        );
        const action = vi.fn();
        const guard = createExecutionGuard(s, "Create column Review in Website", backend, undefined, names);
        await guard.execute({
            toolName: "createStack",
            input: { projectId: "website", title: "Review" },
            defaultExecute: action,
        });
        expect(backend).toHaveBeenCalledTimes(2);
        expect(backend.mock.calls[0][0]).toMatchObject({
            toolName: "listProjects",
            input: { search: "website" },
        });
        expect(action).not.toHaveBeenCalled();
        expect(backend).toHaveBeenLastCalledWith(
            expect.objectContaining({ toolName: "createStack", input: { projectId, title: "Review" } })
        );
        expect(s.pending).toBeUndefined();
    });
    it("resolves a move's task and destination column in that task's project", async () => {
        const lookup = vi.fn(async (name: string) =>
            name === "listTasks"
                ? [{ id: taskId, title: "Buy milk" }]
                : name === "getTask"
                ? { id: taskId, project: projectId }
                : [{ id: stackId, title: "Done" }]
        );
        const result = await resolveReferences({ taskId: "Buy milk", stackId: "Done" }, new Set(), lookup);
        expect(result.input).toEqual({ taskId, stackId });
        expect(lookup).toHaveBeenLastCalledWith("listStacks", { projectId });
    });
    it("stops on ambiguous names and stores the original proposal for a secure reply", async () => {
        const s = session();
        const backend = vi.fn(async () => [
            { id: taskId, title: "Buy milk" },
            { id: stackId, title: "Buy milk" },
        ]);
        const guard = createExecutionGuard(s, "Mark Buy milk done", backend, undefined, names);
        const widget = (await guard.execute({
            toolName: "updateTask",
            input: { taskId: "Buy milk", done: true },
            defaultExecute: vi.fn(),
        })) as any;
        expect(s.pending?.mutation).toBeUndefined();
        expect(s.pending?.resolution).toMatchObject({
            toolName: "updateTask",
            input: { taskId: "Buy milk", done: true },
            field: "taskId",
        });
        const reply = consumeChoice(s, {
            token: widget.pendingActionToken,
            optionIds: [widget.options[0].id],
        });
        expect(reply.widget.options[0].value).toBe(taskId);
        await expect(
            guard.execute({ toolName: "listProjects", input: {}, defaultExecute: vi.fn() })
        ).rejects.toThrow("Await");
    });
    it.each([{ rows: [] }, { rows: [{ id: taskId, title: "Buy milk later" }] }])(
        "does not guess from absent or partial matches",
        async ({ rows }) => {
            const s = session();
            const action = vi.fn();
            const guard = createExecutionGuard(s, "Delete Buy milk", async () => rows, undefined, names);
            await expect(
                guard.execute({
                    toolName: "deleteTask",
                    input: { taskId: "Buy milk" },
                    defaultExecute: action,
                })
            ).rejects.toThrow("Could not find");
            expect(action).not.toHaveBeenCalled();
            expect(s.pending).toBeUndefined();
            expect(guard.stopped()).toBe(true);
        }
    );
    it("does not select from truncated directory results", async () => {
        await expect(
            resolveReferences({ assigneeUserIds: ["Alex"] }, new Set(), async () => ({
                truncated: true,
                people: [{ id: taskId, firstName: "Alex" }],
            }))
        ).rejects.toThrow("incomplete");
    });
    it("propagates authorization errors without issuing confirmation", async () => {
        const s = session();
        const guard = createExecutionGuard(
            s,
            "Delete Buy milk",
            async () => {
                throw new Error("Forbidden");
            },
            undefined,
            names
        );
        await expect(
            guard.execute({ toolName: "deleteTask", input: { taskId: "Buy milk" }, defaultExecute: vi.fn() })
        ).rejects.toThrow("Forbidden");
        expect(s.pending).toBeUndefined();
    });
    it("validates the resolved execution schema before proposing a mutation", async () => {
        const s = session();
        const guard = createExecutionGuard(
            s,
            "Set progress",
            async () => [{ id: taskId, title: "Buy milk" }],
            undefined,
            names
        );
        await expect(
            guard.execute({
                toolName: "updateTask",
                input: { taskId: "Buy milk", progress: 150 },
                defaultExecute: vi.fn(),
            })
        ).rejects.toThrow();
        expect(s.pending).toBeUndefined();
    });
    it("serializes simultaneous calls so only one mutation executes", async () => {
        const s = session();
        const guard = createExecutionGuard(
            s,
            "Create two columns",
            async ({ toolName }) =>
                toolName === "listProjects"
                    ? [{ id: projectId, title: "Website" }]
                    : { id: stackId, title: "Review", projectId },
            undefined,
            names
        );
        const args = {
            toolName: "createStack",
            input: { projectId: "Website", title: "Review" },
            defaultExecute: vi.fn(),
        };
        const results = await Promise.allSettled([
            guard.execute(args),
            guard.execute({ ...args, input: { projectId: "Website", title: "Done" } }),
        ]);
        expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
        expect(guard.summary()).toBe("Column created: Review.");
        expect(s.pending).toBeUndefined();
    });
    it("rejects unsupported action choices and model-issued mutation approvals", async () => {
        for (const choice of [
            { question: "Create a tag?", options: [{ label: "Create Tag" }] },
            { question: "Delete task?", options: [{ label: "Confirm" }] },
        ]) {
            const s = session();
            const execute = vi.fn();
            const guard = createExecutionGuard(s, "Choose");
            await expect(
                guard.execute({ toolName: "askUserChoice", input: choice, defaultExecute: execute })
            ).rejects.toThrow();
            expect(s.pending).toBeUndefined();
            expect(execute).not.toHaveBeenCalled();
        }
    });
});
describe("tool-result summaries", () => {
    it("uses the user's column terminology in deletion summaries", () => {
        expect(mutationSummary("deleteStack", { id: stackId, title: "Temp", deleted: true })).toBe(
            "Column deleted: Temp."
        );
    });
    it("reports only the completed operation and returned title", () => {
        expect(mutationSummary("updateTask", { id: taskId, title: "Buy milk", done: false })).toBe(
            "Task updated: Buy milk."
        );
        expect(mutationSummary("deleteTask", { id: taskId, title: "Buy milk", deleted: true })).toBe(
            "Task deleted: Buy milk."
        );
    });
    it.each([undefined, false, {}, { id: taskId, deleted: false }])(
        "never labels an unconfirmed deletion as success",
        output => {
            expect(() => mutationSummary("deleteTask", output)).toThrow("did not confirm");
        }
    );
});
