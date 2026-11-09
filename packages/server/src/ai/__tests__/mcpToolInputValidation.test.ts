// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("../../loaders", () => ({}));
vi.mock("../../loaders/context", () => ({ getCurrentUser: () => ({ id: "user" }) }));

import { AI_TOOL_REGISTRY, buildAiTools } from "../tools";

const malformedIds: Array<[string, string, unknown]> = [
    ["listActivities", "resourceIds", ["not-a-uuid"]],
    ["summarizeNotepad", "notepadId", "not-a-uuid"],
    ["getCompany", "companyId", "not-a-uuid"],
    ["getPerson", "personId", "not-a-uuid"],
    ["openProfile", "personId", "not-a-uuid"],
    ["createProject", "parentFolderDocumentId", "not-a-uuid"],
    ["createProject", "projectOwnerId", "not-a-uuid"],
    ["getProject", "projectId", "not-a-uuid"],
    ["listReminders", "recordId", "not-a-uuid"],
    ["createStack", "projectId", "not-a-uuid"],
    ["createStack", "beforeStackId", "not-a-uuid"],
    ["createStack", "afterStackId", "not-a-uuid"],
    ["listStacks", "projectId", "not-a-uuid"],
    ["updateStack", "stackId", "not-a-uuid"],
    ["deleteStack", "stackId", "not-a-uuid"],
    ["getTask", "taskId", "not-a-uuid"],
    ["deleteTask", "taskId", "not-a-uuid"],
    ["createTask", "projectId", "not-a-uuid"],
    ["createTask", "stackId", "not-a-uuid"],
    ["createTask", "assigneeUserIds", ["not-a-uuid"]],
    ["updateTask", "taskId", "not-a-uuid"],
    ["updateTask", "assigneeUserIds", ["not-a-uuid"]],
    ["updateTask", "statusTagId", "not-a-uuid"],
    ["getCalendarEvent", "eventId", "not-an-event-id"],
    ["updateCalendarEvent", "eventId", "not-an-event-id"],
    ["moveCalendarEvent", "eventId", "not-an-event-id"],
    ["deleteCalendarEvent", "eventId", "not-an-event-id"],
];

describe("MCP tool UUID input validation", () => {
    it.each(malformedIds)("%s rejects malformed %s before dispatch", async (toolName, field, value) => {
        const tool = AI_TOOL_REGISTRY.find(candidate => candidate.name === toolName);
        expect(tool, `missing registered tool ${toolName}`).toBeDefined();

        const baseInput: Record<string, unknown> = { title: "Valid title" };
        if (toolName === "createStack" || toolName === "createTask") {
            baseInput.projectId = "11111111-1111-4111-8111-111111111111";
        }
        if (toolName === "updateTask") {
            baseInput.taskId = "11111111-1111-4111-8111-111111111111";
        }
        if (toolName === "moveCalendarEvent") {
            baseInput.source = "local";
            baseInput.calendarId = "22222222-2222-4222-8222-222222222222";
        }
        const parsed = (tool!.inputSchema as z.ZodType).safeParse({ ...baseInput, [field]: value });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.issues.some(issue => issue.path[0] === field)).toBe(true);
        }

        const validId = "11111111-1111-4111-8111-111111111111";
        const validValue = Array.isArray(value) ? [validId] : validId;
        const accepted = (tool!.inputSchema as z.ZodType).safeParse({ ...baseInput, [field]: validValue });
        expect(accepted.success).toBe(true);
        if (field === "eventId") {
            const googleId = "google_team_calendar@example.com_event123";
            const acceptedGoogleId = (tool!.inputSchema as z.ZodType).safeParse({
                ...baseInput,
                [field]: googleId,
            });
            expect(acceptedGoogleId.success).toBe(true);
        }

        const executeOverride = vi.fn();
        const executable = buildAiTools([toolName], executeOverride)[toolName] as unknown as {
            execute: (input: unknown, options: unknown) => Promise<unknown>;
        };
        await expect(executable.execute({ ...baseInput, [field]: value }, {})).rejects.toBeInstanceOf(
            z.ZodError
        );
        expect(executeOverride).not.toHaveBeenCalled();
    });
});
