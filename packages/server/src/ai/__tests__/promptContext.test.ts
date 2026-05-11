// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { parseClientRoute } from "../clientRoute";
import {
    CORE_TOOLS,
    TOPIC_TOOLS,
    selectPromptContext,
} from "../promptContext";

describe("promptContext.selectPromptContext", () => {
    it("always includes the core fragment and core tools", () => {
        const sel = selectPromptContext({ newUserMessage: "hi" });
        expect(sel.promptFragments[0]).toBe("system-core.md");
        for (const tool of CORE_TOOLS) {
            expect(sel.allowedTools).toContain(tool);
        }
    });

    it("falls back to tasks when no signal is present (keeps the assistant useful)", () => {
        const sel = selectPromptContext({ newUserMessage: "hello there" });
        expect(sel.topics).toContain("tasks");
        for (const tool of TOPIC_TOOLS.tasks) {
            expect(sel.allowedTools).toContain(tool);
        }
        expect(sel.reasons.tasks).toContain("default fallback");
    });

    it("picks tasks from message keywords", () => {
        const sel = selectPromptContext({ newUserMessage: "what tasks are assigned to me?" });
        expect(sel.topics).toContain("tasks");
        expect(sel.allowedTools).toContain("findTasks");
        expect(sel.reasons.tasks?.some(r => r.includes("keyword"))).toBe(true);
    });

    it("exposes moveTask + listStacks under the tasks topic", () => {
        const sel = selectPromptContext({ newUserMessage: "move this task to Done" });
        expect(sel.topics).toContain("tasks");
        expect(sel.allowedTools).toContain("moveTask");
        // moveTask is useless without a way to discover stack ids; listStacks
        // must survive even on a pure-tasks turn.
        expect(sel.allowedTools).toContain("listStacks");
    });

    it("picks projects + tasks from message keywords", () => {
        const sel = selectPromptContext({ newUserMessage: "add a new column to the board" });
        expect(sel.topics).toEqual(expect.arrayContaining(["projects"]));
        expect(sel.allowedTools).toContain("createStack");
    });

    it("picks notepads from message keywords", () => {
        const sel = selectPromptContext({ newUserMessage: "summarize my latest note" });
        expect(sel.topics).toContain("notepads");
        expect(sel.allowedTools).toContain("listNotepads");
    });

    it("picks calendar from message keywords", () => {
        const sel = selectPromptContext({ newUserMessage: "what's on my calendar this week?" });
        expect(sel.topics).toContain("calendar");
        expect(sel.allowedTools).toContain("listCalendarEvents");
    });

    it("picks org from message keywords", () => {
        const sel = selectPromptContext({ newUserMessage: "list all companies please" });
        expect(sel.topics).toContain("org");
        expect(sel.allowedTools).toContain("listCompanies");
    });

    it("activates topics from the current route even without keywords", () => {
        const route = parseClientRoute({
            section: "project",
            sectionId: "proj-1",
            viewType: "board",
        });
        const sel = selectPromptContext({
            newUserMessage: "any updates here?",
            parsedRoute: route,
            routeSection: "project",
        });
        expect(sel.topics).toEqual(expect.arrayContaining(["tasks", "projects"]));
        expect(sel.reasons.projects?.some(r => r.includes("route"))).toBe(true);
    });

    it("is sticky on recent chat history", () => {
        const sel = selectPromptContext({
            newUserMessage: "also do that for the other one",
            history: [
                { role: "user", content: "list my tasks" },
                { role: "assistant", content: "Here are your tasks." },
            ],
        });
        expect(sel.topics).toContain("tasks");
        expect(sel.reasons.tasks?.some(r => r.includes("sticky"))).toBe(true);
    });

    it("adds reportType → tasks via parsed route", () => {
        const route = parseClientRoute({ section: "reports", sectionId: "my-overdue" });
        const sel = selectPromptContext({
            newUserMessage: "show it",
            parsedRoute: route,
            routeSection: "reports",
        });
        expect(sel.topics).toContain("tasks");
    });

    it("filters tools to the selected topic + core (no accidental leakage)", () => {
        const sel = selectPromptContext({ newUserMessage: "summarize this notepad" });
        expect(sel.allowedTools).toContain("summarizeNotepad");
        // `findTasks` is a tasks-only tool; shouldn't appear on a pure notepad intent
        expect(sel.allowedTools).not.toContain("findTasks");
        // but `navigate` (core) should always be there
        expect(sel.allowedTools).toContain("navigate");
    });

    it("orders prompt fragments: core first, then each active topic", () => {
        const sel = selectPromptContext({
            newUserMessage: "add a new project column and list my tasks",
        });
        expect(sel.promptFragments[0]).toBe("system-core.md");
        expect(sel.promptFragments).toEqual(expect.arrayContaining(["system-tasks.md", "system-projects.md"]));
    });
});
