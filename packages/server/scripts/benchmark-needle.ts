// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { eligibleNeedleTools } from "../src/ai/needle/eligibility";
import { performance } from "node:perf_hooks";
import { AI_TOOL_REGISTRY } from "../src/ai/tools";
import { needleSchema, presentResult, NEEDLE_TOOL_METADATA } from "../src/ai/needle/catalog";
import { initializeNeedle, planWithNeedle, stopNeedle } from "../src/ai/needle/runtime";
const examples: Record<string, string> = {
    listProjects: "List my projects",
    createProject: 'Create a project called "Website"',
    getProject: "Show project Website",
    createStack: 'Create a column "Review" in Website',
    listStacks: "List columns in Website",
    updateStack: 'Rename column Review to "Ready"',
    deleteStack: "Delete column Column XYZ",
    findTasks: "Open tasks assigned to me",
    listTasks: "List tasks in Website",
    getTask: "Show task Buy milk",
    createTask: 'Create task "Buy milk" in Website tomorrow',
    moveTask: "Move Buy milk to Done",
    updateTask: "Mark Buy milk done",
    searchPeople: "Find people called Alex",
    getPerson: "Show person Alex",
    openProfile: "Open my profile",
    listCompanies: "List companies",
    getCompany: "Show company Acme",
    listTags: "List tags",
    listBookmarks: "List my bookmarks",
    globalSearch: "Search everywhere for budget",
    listNotepads: "List notepads",
    summarizeNotepad: "Summarize notepad Planning",
    listReminders: "List reminders for Buy milk",
    listActivities: "List comments for Buy milk",
    listCalendars: "List calendars",
    createLocalCalendar: 'Create calendar "Work"',
    updateLocalCalendar: 'Rename calendar Work to "Team"',
    deleteLocalCalendar: "Delete calendar Work",
    listCalendarEvents: "List this week's events",
    getCalendarEvent: "Show event Standup",
    createCalendarEvent: 'Create event "Standup" tomorrow from 09:00 to 09:30',
    updateCalendarEvent: 'Rename Standup to "Planning"',
    moveCalendarEvent: "Move event Standup to calendar Work",
    deleteCalendarEvent: "Delete event Standup",
    askUserChoice: "Ask me to choose red or blue",
    navigate: "Open my tasks",
};
const expectedArguments: Record<string, Record<string, unknown>> = {
    listProjects: {},
    createProject: { title: "Website" },
    getProject: { projectId: "Website" },
    createStack: { projectId: "Website", title: "Review" },
    listStacks: { projectId: "Website" },
    updateStack: { stackId: "Review", title: "Ready" },
    deleteStack: { stackId: "Column XYZ" },
    findTasks: { assigneeUserIds: "me" },
    listTasks: { projectId: "Website" },
    getTask: { taskId: "Buy milk" },
    createTask: { projectId: "Website", title: "Buy milk", duedate: "tomorrow" },
    moveTask: { taskId: "Buy milk", stackId: "Done" },
    updateTask: { taskId: "Buy milk", done: true },
    searchPeople: { query: "Alex" },
    getPerson: { personId: "Alex" },
    openProfile: {},
    listCompanies: {},
    getCompany: { companyId: "Acme" },
    listTags: {},
    listBookmarks: {},
    globalSearch: { query: "budget" },
    listNotepads: {},
    summarizeNotepad: { notepadId: "Planning" },
    listReminders: { recordId: "Buy milk" },
    listActivities: { resourceIds: ["Buy milk"] },
    listCalendars: {},
    createLocalCalendar: { title: "Work" },
    updateLocalCalendar: { calendarId: "Work", title: "Team" },
    deleteLocalCalendar: { calendarId: "Work" },
    listCalendarEvents: { span: "week" },
    getCalendarEvent: { eventId: "Standup" },
    createCalendarEvent: { title: "Standup", start: "2026-10-14T09:00:00", end: "2026-10-14T09:30:00" },
    updateCalendarEvent: { eventId: "Standup", title: "Planning" },
    moveCalendarEvent: { eventId: "Standup", calendarId: "Work" },
    deleteCalendarEvent: { eventId: "Standup" },
    navigate: { view: "myTasks" },
    askUserChoice: { control: "radio" },
};
function argumentsMatch(name: string, args?: Record<string, unknown>) {
    if (!args) return false;
    if (name === "updateTask" && args.title !== undefined) return false;
    if (name === "askUserChoice") {
        const labels = (args.options as { label: string }[] | undefined)?.map(option =>
            option.label.toLowerCase()
        );
        return Boolean(labels?.includes("red") && labels.includes("blue"));
    }
    return Object.entries(expectedArguments[name]).every(
        ([key, value]) =>
            (JSON.stringify(args[key]) ?? "").toLowerCase() === JSON.stringify(value).toLowerCase()
    );
}
async function main() {
    const start = performance.now();
    await initializeNeedle();
    const coldMs = performance.now() - start;
    const matrix = [];
    for (const tool of process.argv.includes("--retrieval-only") ? [] : AI_TOOL_REGISTRY) {
        if (!examples[tool.name] || !NEEDLE_TOOL_METADATA[tool.name] || !expectedArguments[tool.name])
            throw new Error(`Coverage missing: ${tool.name}`);
        const query = examples[tool.name];
        console.error("Benchmark", tool.name);
        const result = await planWithNeedle({
            tools: [needleSchema(tool.name)],
            system: "date: 2026-10-13 Tue 12:00; locale: en-US",
            inputs: [query],
        });
        presentResult(tool.name, {});
        const call = [...result.response.function_calls, ...(result.response.suppressed_calls ?? [])].find(
            call => call.name === tool.name
        );
        matrix.push({
            tool: tool.name,
            query,
            schemaInitialized: result.response.success,
            selected: Boolean(call),
            arguments: call?.arguments,
            expectedArguments: expectedArguments[tool.name],
            argumentMatch: argumentsMatch(tool.name, call?.arguments),
            compatibility: !result.response.success
                ? "schema rejected"
                : !call
                ? "no call"
                : argumentsMatch(tool.name, call.arguments)
                ? "representative arguments matched"
                : "argument mismatch",
            presentation: "mapped",
            validation: result.response.validation,
            confidence: result.response.confidence,
            latencyMs: Math.round(result.elapsedMs),
            memoryBytes: result.memoryBytes,
            references: NEEDLE_TOOL_METADATA[tool.name].references,
        });
    }
    const retrieval = [];
    for (const name of ["createTask", "listCalendars", "listProjects", "navigate", "deleteLocalCalendar"]) {
        const result = await planWithNeedle({
            tools: eligibleNeedleTools(
                AI_TOOL_REGISTRY.map(t => t.name),
                examples[name]
            ).map(name => needleSchema(name)),
            system: "date: 2026-10-13",
            inputs: [examples[name]],
            query: examples[name],
        });
        retrieval.push({
            expected: name,
            calls: result.response.function_calls,
            retrievedTools: result.retrievedTools,
            selectedTools: result.selectedTools,
            confidence: result.response.confidence,
            latencyMs: result.elapsedMs,
        });
    }
    console.log(
        JSON.stringify(
            {
                node: process.version,
                platform: `${process.platform}-${process.arch}`,
                coldMs,
                matrix,
                retrieval,
            },
            null,
            2
        )
    );
    if (matrix.some(row => !row.schemaInitialized))
        throw new Error("A registered schema failed initialization");
}
main().then(
    async () => {
        await stopNeedle();
        process.exit(0);
    },
    async error => {
        console.error(error);
        await stopNeedle();
        process.exit(1);
    }
);
