// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
    execute: vi.fn(),
    plan: vi.fn(),
    resolve: vi.fn(),
    user: { id: "user", tenant: "tenant", email: "user@example.test" },
}));
vi.mock("../tools", () => ({
    AI_TOOL_REGISTRY: [
        {
            name: "createStack",
            description: "Create column",
            inputSchema: z.object({
                projectId: z.string(),
                title: z.string(),
                insertIndex: z.number().optional(),
            }),
            execute: mocks.execute,
        },
        {
            name: "deleteStack",
            description: "Delete column",
            inputSchema: z.object({ stackId: z.string() }),
            execute: mocks.execute,
        },
        {
            name: "deleteTask",
            description: "Delete task",
            inputSchema: z.object({ taskId: z.string() }),
            execute: mocks.execute,
        },
        {
            name: "updateTask",
            description: "Update task",
            inputSchema: z.object({
                taskId: z.string(),
                title: z.string().optional(),
                done: z.boolean().optional(),
            }),
            execute: mocks.execute,
        },
        {
            name: "createTask",
            description: "Create task",
            inputSchema: z.object({
                projectId: z.string(),
                title: z.string(),
                duedate: z.string().optional(),
                stackId: z.string().optional(),
            }),
            execute: mocks.execute,
        },
        {
            name: "listTasks",
            description: "List tasks",
            inputSchema: z.object({
                assignedOnly: z.boolean().optional(),
                assigneeUserIds: z.string().optional(),
            }),
            execute: mocks.execute,
        },
        {
            name: "createProject",
            description: "Create a project",
            inputSchema: z.object({ title: z.string().min(1) }),
            execute: mocks.execute,
        },
        {
            name: "listProjects",
            description: "List projects",
            inputSchema: z.object({}),
            execute: mocks.execute,
        },
        {
            name: "getProject",
            description: "Get project",
            inputSchema: z.object({ projectId: z.string() }),
            execute: mocks.execute,
        },
    ],
}));
vi.mock("../promptContext", () => ({
    selectPromptContext: () => ({
        allowedTools: [
            "createProject",
            "createStack",
            "deleteStack",
            "deleteTask",
            "listProjects",
            "getProject",
            "updateTask",
            "createTask",
            "listTasks",
        ],
    }),
}));
vi.mock("../../services/requestContext", () => ({ requestContext: { getCurrentUser: () => mocks.user } }));
vi.mock("../needle/runtime", () => ({ planWithNeedle: mocks.plan }));
vi.mock("../needle/references", () => ({ resolveReference: mocks.resolve }));
import { eligibleNeedleTools } from "../needle/eligibility";
import { runNeedleTurn } from "../needle/pipeline";
import { getChatSession } from "../needle/sessions";
import { needleSchema, presentResult } from "../needle/catalog";
const reply = (name: string, args: Record<string, unknown>, confidence: number | null = 0.9) => ({
    response: { type: "call", success: true, function_calls: [{ name, arguments: args }], confidence },
    elapsedMs: 1,
    memoryBytes: 1,
});
const done = {
    response: { type: "respond", success: true, function_calls: [] },
    elapsedMs: 1,
    memoryBytes: 1,
};
let sequence = 0;
const request = () => ({
    conversationId: `test-${++sequence}`,
    message: "Create a project Website",
    history: [],
});
beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.tenant = "tenant";
    mocks.execute.mockResolvedValue({ id: "project", title: "Website" });
    mocks.plan.mockResolvedValue(done);
});
describe("Needle execution boundary", () => {
    it("executes validated calls once and presents structured results", async () => {
        mocks.plan.mockResolvedValueOnce(reply("createProject", { title: "Website" }));
        const result = await runNeedleTurn(request());
        expect(mocks.execute).toHaveBeenCalledOnce();
        expect(result.mutated).toBe(true);
        expect(result.widgets[0].type).toBe("result");
    });
    it("requires a server-bound confirmation for low or missing confidence", async () => {
        const input = request();
        mocks.plan.mockResolvedValueOnce(reply("createProject", { title: "Website" }, null));
        const result = await runNeedleTurn(input);
        const choice = result.widgets[0];
        expect(choice.type).toBe("choice");
        expect(mocks.execute).not.toHaveBeenCalled();
        if (choice.type !== "choice") throw new Error("Missing choice");
        const invalid = await runNeedleTurn({
            ...input,
            choiceReply: { token: "forged", optionIds: [choice.options[0].id] },
        });
        expect(invalid.widgets[0].type).toBe("status");
        expect(mocks.execute).not.toHaveBeenCalled();
        await runNeedleTurn({
            ...input,
            choiceReply: { token: choice.pendingActionToken!, optionIds: [choice.options[0].id] },
        });
        expect(mocks.execute).toHaveBeenCalledOnce();
    });
    it("does not authorize a token from another tenant", async () => {
        const input = request();
        mocks.plan.mockResolvedValueOnce(reply("createProject", { title: "Website" }, 0.2));
        const result = await runNeedleTurn(input);
        const widget = result.widgets[0];
        if (widget.type !== "choice") throw new Error("Missing choice");
        mocks.user.tenant = "other";
        await runNeedleTurn({
            ...input,
            choiceReply: { token: widget.pendingActionToken!, optionIds: [widget.options[0].id] },
        });
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("asks for missing required fields before executing", async () => {
        const input = request();
        mocks.plan.mockResolvedValueOnce(reply("createProject", {}));
        const result = await runNeedleTurn(input);
        expect(result.widgets[0].type).toBe("status");
        expect(mocks.execute).not.toHaveBeenCalled();
        await runNeedleTurn({ ...input, message: "Website" });
        expect(mocks.execute).toHaveBeenCalledWith({ title: "Website" });
    });
    it("asks the user to disambiguate names", async () => {
        mocks.plan.mockResolvedValueOnce(reply("getProject", { projectId: "Website" }));
        mocks.resolve.mockResolvedValue([
            { id: "a", label: "Website A" },
            { id: "b", label: "Website B" },
        ]);
        const result = await runNeedleTurn(request());
        expect(result.widgets[0].type).toBe("choice");
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("resolves a named column before deleting it, and clarifies duplicate names", async () => {
        const input = {
            ...request(),
            message: "Delete column Column XYZ",
            route: { section: "project", sectionId: "project-1" },
        };
        mocks.plan.mockResolvedValueOnce(reply("deleteStack", { stackId: "Column XYZ" }));
        mocks.resolve.mockResolvedValueOnce([{ id: "stack-1", label: "Column XYZ" }]);
        const deleted = await runNeedleTurn(input);
        expect(mocks.resolve).toHaveBeenCalledWith("stack", "Column XYZ", "project-1");
        expect(mocks.execute).toHaveBeenCalledWith({ stackId: "stack-1" });
        expect(deleted.widgets[0].type).toBe("result");

        mocks.execute.mockClear();
        mocks.plan.mockResolvedValueOnce(reply("deleteStack", { stackId: "Column XYZ" }));
        mocks.resolve.mockResolvedValueOnce([
            { id: "stack-1", label: "Column XYZ" },
            { id: "stack-2", label: "Other / Column XYZ" },
        ]);
        const ambiguous = await runNeedleTurn(input);
        expect(ambiguous.widgets[0].type).toBe("choice");
        expect(mocks.execute).not.toHaveBeenCalled();
    });

    it("recovers a requested column name when Needle returns the current project UUID", async () => {
        const projectId = "dab82b93-ba4f-498a-be63-f98111c02190";
        mocks.plan.mockResolvedValueOnce(reply("deleteStack", { stackId: projectId }));
        mocks.resolve.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "column-3", label: "Col 3" }]);
        const result = await runNeedleTurn({
            ...request(),
            message: "delete Col 3",
            route: { section: "project", sectionId: projectId },
        });
        expect(mocks.resolve).toHaveBeenNthCalledWith(1, "stack", projectId, projectId);
        expect(mocks.resolve).toHaveBeenNthCalledWith(2, "stack", "Col 3", projectId);
        expect(mocks.execute).toHaveBeenCalledWith({ stackId: "column-3" });
        expect(result.widgets[0].type).toBe("result");
    });

    it("resolves a named task in the current project before deleting it", async () => {
        const projectId = "dab82b93-ba4f-498a-be63-f98111c02190";
        mocks.plan.mockResolvedValueOnce(reply("deleteTask", { taskId: "Task 1" }));
        mocks.resolve.mockResolvedValueOnce([{ id: "task-1", label: "Task 1" }]);
        const result = await runNeedleTurn({
            ...request(),
            message: "Delete Task 1",
            route: { section: "project", sectionId: projectId },
        });
        expect(mocks.resolve).toHaveBeenCalledWith("task", "Task 1", projectId);
        expect(mocks.execute).toHaveBeenCalledWith({ taskId: "task-1" });
        expect(result.widgets[0].type).toBe("result");
    });

    it("does not trust a UUID echoed in the confirmation label", async () => {
        const projectId = "dab82b93-ba4f-498a-be63-f98111c02190";
        const input = {
            ...request(),
            message: "delete column Col 3",
            route: { section: "project", sectionId: projectId },
        };
        mocks.plan.mockResolvedValueOnce(reply("deleteStack", { stackId: projectId }, 0.2));
        const confirmation = await runNeedleTurn(input);
        const widget = confirmation.widgets[0];
        if (widget.type !== "choice") throw new Error("Missing confirmation");

        mocks.resolve.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "column-3", label: "Col 3" }]);
        await runNeedleTurn({
            ...input,
            message: `Deleted column: stack: ${projectId}\nSelected: Confirm`,
            choiceReply: {
                token: widget.pendingActionToken!,
                optionIds: [widget.options.find(option => option.label === "Confirm")!.id],
            },
        });

        expect(mocks.resolve).toHaveBeenNthCalledWith(1, "stack", projectId, projectId);
        expect(mocks.resolve).toHaveBeenNthCalledWith(2, "stack", "Col 3", projectId);
        expect(mocks.execute).toHaveBeenCalledWith({ stackId: "column-3" });
    });

    it("recovers the task name when confirmation echoes the project UUID as taskId", async () => {
        const projectId = "dab82b93-ba4f-498a-be63-f98111c02190";
        const input = {
            ...request(),
            message: "delete Task 1",
            route: { section: "project", sectionId: projectId },
        };
        mocks.plan.mockResolvedValueOnce(reply("deleteTask", { taskId: projectId }, 0.2));
        const confirmation = await runNeedleTurn(input);
        const widget = confirmation.widgets[0];
        if (widget.type !== "choice") throw new Error("Missing confirmation");

        mocks.resolve.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "task-1", label: "Task 1" }]);
        await runNeedleTurn({
            ...input,
            message: `Deleted task: task: ${projectId}\nSelected: Confirm`,
            choiceReply: {
                token: widget.pendingActionToken!,
                optionIds: [widget.options.find(option => option.label === "Confirm")!.id],
            },
        });

        expect(mocks.resolve).toHaveBeenNthCalledWith(1, "task", projectId, projectId);
        expect(mocks.resolve).toHaveBeenNthCalledWith(2, "task", "Task 1", projectId);
        expect(mocks.execute).toHaveBeenCalledWith({ taskId: "task-1" });
    });

    it("validates an unstated model-generated UUID through the matching entity lookup", async () => {
        mocks.plan.mockResolvedValueOnce(
            reply("getProject", { projectId: "550e8400-e29b-41d4-a716-446655440000" })
        );
        mocks.resolve.mockResolvedValueOnce([]);
        await runNeedleTurn(request());
        expect(mocks.resolve).toHaveBeenCalledWith(
            "project",
            "550e8400-e29b-41d4-a716-446655440000",
            "550e8400-e29b-41d4-a716-446655440000"
        );
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("finishes a mutation without planning unsolicited follow-up actions", async () => {
        mocks.plan
            .mockResolvedValueOnce(reply("createProject", { title: "Website" }))
            .mockRejectedValueOnce(new Error("timeout"));
        const result = await runNeedleTurn(request());
        expect(result.mutated).toBe(true);
        expect(result.fallback).toBeUndefined();
        expect(mocks.plan).toHaveBeenCalledOnce();
        expect(mocks.execute).toHaveBeenCalledOnce();
    });
    it("rejects an unintended title change in a completion request", async () => {
        mocks.plan.mockResolvedValueOnce(
            reply("updateTask", { taskId: "Buy milk", title: "Mark Buy milk", done: true })
        );
        const turn = await runNeedleTurn({ ...request(), message: "Mark Buy milk done" });
        expect(turn.fallback).toBe("unrequested title change");
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("normalizes supported relative dates and asks for unsupported dates", async () => {
        mocks.resolve.mockResolvedValue([{ id: "project", label: "Website" }]);
        mocks.plan.mockResolvedValueOnce(
            reply("createTask", { projectId: "Website", title: "Buy milk", duedate: "tomorrow" })
        );
        await runNeedleTurn({
            ...request(),
            message: "Create task Buy milk tomorrow in Website in the default column",
        });
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() + 1);
        expect(mocks.execute).toHaveBeenCalledWith({
            projectId: "project",
            title: "Buy milk",
            duedate: date.toISOString(),
        });
        mocks.execute.mockClear();
        mocks.plan.mockResolvedValueOnce(
            reply("createTask", { projectId: "Website", title: "Buy milk", duedate: "next Thursday" })
        );
        const turn = await runNeedleTurn({
            ...request(),
            message: "Create Buy milk next Thursday in the default column",
        });
        expect(turn.widgets[0].type).toBe("status");
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("executes multiple distinct calls sequentially", async () => {
        const plan = reply("createProject", { title: "Website" });
        plan.response.function_calls.push({ name: "createProject", arguments: { title: "Mobile" } });
        mocks.plan.mockResolvedValueOnce(plan);
        await runNeedleTurn({ ...request(), message: "Create Website and Mobile" });
        expect(mocks.execute.mock.calls.map(args => args[0].title)).toEqual(["Website", "Mobile"]);
    });
    it("preserves column creation eligibility after confirmation and stops after creation", async () => {
        const input = {
            ...request(),
            message: "create a column name Col 3",
            route: { section: "project", sectionId: "dab82b93-ba4f-498a-be63-f98111c02190" },
        };
        mocks.plan.mockResolvedValueOnce(reply("createStack", { title: "Col 3" }, 0.5));
        const result = await runNeedleTurn(input);
        const widget = result.widgets[0];
        if (widget.type !== "choice") throw new Error("Missing choice");
        const resumed = await runNeedleTurn({
            ...input,
            message: "Column: Selected: Confirm",
            choiceReply: { token: widget.pendingActionToken!, optionIds: [widget.options[0].id] },
        });
        expect(mocks.execute).toHaveBeenCalledWith({ projectId: input.route.sectionId, title: "Col 3" });
        expect(mocks.plan).toHaveBeenCalledOnce();
        expect(resumed.widgets.some(widget => widget.type === "choice")).toBe(false);
    });
    it("creates the requested task in the current project's named column without a folder id", async () => {
        const projectId = "dab82b93-ba4f-498a-be63-f98111c02190";
        mocks.resolve.mockResolvedValue([{ id: "column", label: "Col 3" }]);
        mocks.plan.mockResolvedValueOnce(reply("createTask", { title: "Hello world", projectId: "Col 3" }));
        const result = await runNeedleTurn({
            ...request(),
            message: 'create a new task in Col 3 called "Hello world"',
            route: { section: "project", sectionId: projectId },
        });
        expect(mocks.resolve).toHaveBeenCalledWith("stack", "Col 3", projectId);
        expect(mocks.execute).toHaveBeenCalledWith({ projectId, stackId: "column", title: "Hello world" });
        expect(result.widgets[0].type).toBe("result");
        const schemas = mocks.plan.mock.calls[0][0].tools.map((tool: { name: string }) => tool.name);
        expect(schemas).toContain("createTask");
        expect(schemas).not.toContain("createProject");
    });
    it("honors a configured confidence threshold and still confirms lower scores", async () => {
        const previous = process.env.AI_NEEDLE_CONFIDENCE_THRESHOLD;
        process.env.AI_NEEDLE_CONFIDENCE_THRESHOLD = "0.5";
        try {
            mocks.plan.mockResolvedValueOnce(reply("createProject", { title: "Website" }, 0.5));
            await runNeedleTurn(request());
            expect(mocks.execute).toHaveBeenCalledOnce();
            mocks.execute.mockClear();
            mocks.plan.mockResolvedValueOnce(reply("createProject", { title: "Website" }, 0.49));
            const result = await runNeedleTurn(request());
            expect(result.widgets[0].type).toBe("choice");
            expect(mocks.execute).not.toHaveBeenCalled();
        } finally {
            if (previous === undefined) delete process.env.AI_NEEDLE_CONFIDENCE_THRESHOLD;
            else process.env.AI_NEEDLE_CONFIDENCE_THRESHOLD = previous;
        }
    });
    it("applies the threshold to suppressed calls after removing ungrounded optional fields", async () => {
        const plan = reply("createStack", {
            projectId: "dab82b93-ba4f-498a-be63-f98111c02190",
            title: "Col 3",
            insertIndex: 0,
        });
        mocks.plan.mockResolvedValueOnce({
            ...plan,
            response: {
                ...plan.response,
                function_calls: [],
                suppressed_calls: plan.response.function_calls,
                validation: { ungrounded: ["create_stack.insert_index"] },
            },
        });
        const result = await runNeedleTurn({
            ...request(),
            message: "create a column name Col 3",
            route: { section: "project", sectionId: "dab82b93-ba4f-498a-be63-f98111c02190" },
        });
        expect(mocks.execute).toHaveBeenCalledWith({
            projectId: "dab82b93-ba4f-498a-be63-f98111c02190",
            title: "Col 3",
        });
        expect(result.widgets[0].type).toBe("result");
    });
    it("does not infer a task due date from the system date", async () => {
        mocks.plan.mockResolvedValueOnce(
            reply("createTask", { title: "Hello world", duedate: "2026-10-13" })
        );
        await runNeedleTurn({
            ...request(),
            message: 'create a new task called "Hello world" in the default column',
            route: { section: "project", sectionId: "dab82b93-ba4f-498a-be63-f98111c02190" },
        });
        expect(mocks.execute).toHaveBeenCalledWith({
            projectId: "dab82b93-ba4f-498a-be63-f98111c02190",
            title: "Hello world",
        });
    });
    it("shadow mode never executes tools", async () => {
        mocks.plan.mockResolvedValueOnce(reply("createProject", { title: "Website" }));
        const result = await runNeedleTurn({ ...request(), shadow: true });
        expect(result.fallback).toBe("shadow");
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("refuses negated calls and stops repeated mutations", async () => {
        const value = reply("createProject", { title: "Website" });
        mocks.plan.mockResolvedValueOnce({
            ...value,
            response: { ...value.response, validation: { negation: true } },
        });
        await runNeedleTurn(request());
        expect(mocks.execute).not.toHaveBeenCalled();
        mocks.plan.mockResolvedValue(value);
        await runNeedleTurn(request());
        expect(mocks.execute).toHaveBeenCalledOnce();
    });
});
describe("Needle state and presentation", () => {
    it("expires pending choices and isolates conversations", () => {
        const a = getChatSession("a", "u", "c", 0);
        a.context.push("private");
        expect(getChatSession("b", "u", "c", 0).context).toEqual([]);
        expect(getChatSession("a", "u", "d", 0).context).toEqual([]);
        expect(getChatSession("a", "u", "c", 1800001).context).toEqual([]);
    });
    it("derives structural schemas and bounds visible results", () => {
        expect(needleSchema("createProject").parameters.required).toContain("title");
        const result = presentResult(
            "listProjects",
            Array.from({ length: 21 }, (_, id) => ({ id: String(id), title: "Project" }))
        );
        expect(result.type).toBe("result");
        if (result.type === "result") {
            expect(result.items).toHaveLength(20);
            expect(result.truncated).toBe(true);
        }
    });
});

it("excludes event deletion when the request explicitly targets a calendar", () => {
    expect(
        eligibleNeedleTools(
            ["deleteCalendarEvent", "deleteLocalCalendar", "createLocalCalendar", "listCalendars"],
            "Delete calendar Work"
        )
    ).toEqual(["deleteLocalCalendar", "listCalendars"]);
    expect(
        eligibleNeedleTools(
            ["deleteCalendarEvent", "deleteLocalCalendar"],
            "Delete event Standup from calendar Work"
        )
    ).toContain("deleteCalendarEvent");
});

it("filters explicit creation targets without confusing the destination column with the task", () => {
    const tools = ["createProject", "createStack", "createTask", "listStacks"];
    expect(eligibleNeedleTools(tools, "create a column name Col 3")).toEqual(["createStack", "listStacks"]);
    expect(eligibleNeedleTools(tools, 'create a new task in Col 3 called "Hello world"')).toEqual([
        "createTask",
        "listStacks",
    ]);
});

it("keeps deletion tools aligned with the entity named by the user", () => {
    const tools = ["deleteTask", "deleteStack", "deleteCalendarEvent", "deleteLocalCalendar"];
    expect(eligibleNeedleTools(tools, "Delete Task 1")).toEqual(["deleteTask"]);
    expect(eligibleNeedleTools(tools, "Delete Task 1 from Col 1")).toEqual(["deleteTask"]);
});
