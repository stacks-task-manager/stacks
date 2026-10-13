// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { asSchema } from "ai";
import type { AiChatWidget } from "@stacks/types";
import { AI_TOOL_REGISTRY } from "../tools";
export type ReferenceKind =
    | "project"
    | "task"
    | "stack"
    | "person"
    | "company"
    | "calendar"
    | "event"
    | "notepad"
    | "tag"
    | "folder";
export type ToolMetadata = { mutation: boolean; label: string; references: Record<string, ReferenceKind> };
const meta = (
    label: string,
    references: Record<string, ReferenceKind> = {},
    mutation = false
): ToolMetadata => ({ label, references, mutation });
export const NEEDLE_TOOL_METADATA: Record<string, ToolMetadata> = {
    listProjects: meta("Projects"),
    createProject: meta("Project", { projectOwnerId: "person", parentFolderDocumentId: "folder" }, true),
    getProject: meta("Project", { projectId: "project" }),
    createStack: meta("Column", { projectId: "project" }, true),
    listStacks: meta("Columns", { projectId: "project" }),
    updateStack: meta("Column", { stackId: "stack" }, true),
    deleteStack: meta("Deleted column", { stackId: "stack" }, true),
    findTasks: meta("Tasks", {
        projectId: "project",
        project: "project",
        taskIds: "task",
        stackId: "stack",
        parentTaskId: "task",
        assigneeUserIds: "person",
    }),
    listTasks: meta("Tasks", {
        projectId: "project",
        project: "project",
        taskIds: "task",
        stackId: "stack",
        parentTaskId: "task",
        assigneeUserIds: "person",
    }),
    getTask: meta("Task", { taskId: "task" }),
    deleteTask: meta("Deleted task", { taskId: "task" }, true),
    createTask: meta("Task", { projectId: "project", stackId: "stack", assigneeUserIds: "person" }, true),
    moveTask: meta("Task", { taskId: "task", stackId: "stack", afterTaskId: "task" }, true),
    updateTask: meta("Task", { taskId: "task", assigneeUserIds: "person", statusTagId: "tag" }, true),
    searchPeople: meta("People"),
    getPerson: meta("Person", { personId: "person" }),
    openProfile: meta("Profile", { personId: "person" }),
    listCompanies: meta("Companies"),
    getCompany: meta("Company", { companyId: "company" }),
    listTags: meta("Tags"),
    listBookmarks: meta("Bookmarks"),
    globalSearch: meta("Results"),
    listNotepads: meta("Notepads"),
    summarizeNotepad: meta("Source preview", { notepadId: "notepad" }),
    listReminders: meta("Reminders", { recordId: "task" }),
    listActivities: meta("Activities", { resourceIds: "task" }),
    listCalendars: meta("Calendars"),
    createLocalCalendar: meta("Calendar", {}, true),
    updateLocalCalendar: meta("Calendar", { calendarId: "calendar" }, true),
    deleteLocalCalendar: meta("Calendar", { calendarId: "calendar" }, true),
    listCalendarEvents: meta("Events"),
    getCalendarEvent: meta("Event", { eventId: "event" }),
    createCalendarEvent: meta("Event", { calendar: "calendar" }, true),
    updateCalendarEvent: meta("Event", { eventId: "event" }, true),
    moveCalendarEvent: meta("Event", { eventId: "event", calendarId: "calendar" }, true),
    deleteCalendarEvent: meta("Event", { eventId: "event" }, true),
    askUserChoice: meta("Choice"),
    navigate: meta("Open"),
};
export function getTool(name: string) {
    const tool = AI_TOOL_REGISTRY.find(t => t.name === name);
    if (!tool || !NEEDLE_TOOL_METADATA[name]) throw new Error(`Unknown tool: ${name}`);
    return tool;
}
// Refinements remain authoritative in Zod. Needle grammar handles the structural schema.
export function needleSchema(name: string, defaults: Record<string, string> = {}) {
    const def = getTool(name);
    const parameters = JSON.parse(
        JSON.stringify((asSchema as (schema: unknown) => { jsonSchema: unknown })(def.inputSchema).jsonSchema)
    );
    delete parameters.$schema;
    const references = NEEDLE_TOOL_METADATA[name].references;
    for (const [field, kind] of Object.entries(references)) {
        const original = parameters.properties?.[field];
        if (!original) continue;
        const item = { type: "string", description: `${kind} name or id stated in the request` };
        parameters.properties[field] =
            original.type === "array"
                ? { type: "array", items: item }
                : original.anyOf?.some((s: { type?: string }) => s.type === "array")
                ? { anyOf: [item, { type: "array", items: item }] }
                : item;
        if (defaults[field]) parameters.properties[field].default = defaults[field];
    }
    if (name === "navigate")
        parameters.properties.id.description =
            "Entity name or id stated in the request; omitted for home, calendar, inbox and other flat views";
    return {
        name,
        description: def.description.split(/\. (?:Use|Requires|Reply|Do NOT|Returns)/)[0],
        parameters,
    };
}
const humanLabel = (name: string) =>
    name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, s => s.toUpperCase());
export function presentResult(name: string, output: unknown): AiChatWidget {
    const meta = NEEDLE_TOOL_METADATA[name];
    if (!meta) throw new Error(`Missing presentation: ${name}`);
    const object = output && typeof output === "object" ? (output as Record<string, unknown>) : {};
    const array = Array.isArray(output)
        ? output
        : (Object.values(object).find(Array.isArray) as unknown[] | undefined);
    const rows = array ?? [output];
    const items = rows.slice(0, 20).map(raw => {
        const row: Record<string, unknown> =
            raw && typeof raw === "object" ? (raw as Record<string, unknown>) : { value: raw };
        const label = String(
            row.title ??
                row.label ??
                row.name ??
                [row.firstName, row.lastName].filter(Boolean).join(" ") ??
                ""
        );
        const fields = Object.entries(row)
            .filter(
                ([key, value]) =>
                    !/^(id|.*Id|summary|hashPath|title|label|name)$/.test(key) &&
                    !Array.isArray(value) &&
                    (typeof value !== "object" || value === null)
            )
            .slice(0, 12)
            .map(([key, value]) => ({
                label: humanLabel(key),
                value: String(value ?? "—")
                    .replace(/<[^>]*>/g, "")
                    .slice(0, key === "content" ? 400 : 300),
            }));
        const id = typeof row.id === "string" ? row.id : undefined;
        const encoded = id
            ? encodeURIComponent(
                  /Notepad/.test(name) && typeof row.documentId === "string" ? row.documentId : id
              )
            : undefined;
        const hashPath =
            typeof row.hashPath === "string"
                ? row.hashPath
                : !encoded
                ? undefined
                : /Task/.test(name) && (row.projectId ?? row.project)
                ? `/project/${encodeURIComponent(String(row.projectId ?? row.project))}/${encoded}`
                : /Project/.test(name)
                ? `/project/${encoded}`
                : /Notepad/.test(name)
                ? `/notepad/${encoded}`
                : /Compan/.test(name)
                ? `/company/${encoded}`
                : /People|Person/.test(name)
                ? `/person/${encoded}`
                : undefined;
        return { label, fields, hashPath };
    });
    return {
        type: "result",
        label: meta.label,
        items,
        truncated: rows.length > 20 || object.truncated === true,
    };
}
