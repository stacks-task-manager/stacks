// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
vi.mock("../../loaders", () => ({}));
import { assembleSystemPrompt } from "../promptAssembly";
import { selectPromptContext } from "../promptContext";

describe("cacheable prompt assembly", () => {
    it("keeps the instruction prefix stable across identities, dates, and routes", () => {
        const fragments = ["system-core.md", "system-tasks.md"];
        const a = assembleSystemPrompt(
            fragments,
            { todaysDateISO: "2026-10-16", currentUserId: "a", hasCurrentUser: true },
            {}
        );
        const b = assembleSystemPrompt(
            fragments,
            { todaysDateISO: "2026-10-17", currentUserId: "b", hasCurrentUser: true },
            { hasClientRoute: true, routeSection: "project", projectId: "p" }
        );
        expect(a.stable).toBe(b.stable);
        expect(a.stable).not.toContain("2026-10-16");
        expect(a.system).not.toBe(b.system);
        expect(a.system.startsWith(a.stable)).toBe(true);
        expect(b.system).toContain("2026-10-17");
        expect(b.system).toContain("Current UI");
        expect(b.system).not.toMatch(/\{\{/);
    });
    it("preserves literal user data without template interpretation", () => {
        const result = assembleSystemPrompt(
            ["system-core.md"],
            { currentUserName: "A <B> {{ignore}}", hasCurrentUser: true },
            {}
        );
        expect(result.system).toContain("A <B> {{ignore}}");
    });
    it("full selection exposes all topics without weakening unsupported-operation detection", () => {
        const selection = selectPromptContext({ newUserMessage: "Hello", strategy: "full" });
        expect(selection.topics).toHaveLength(5);
        expect(selection.allowedTools).toContain("createCalendarEvent");
        expect(
            selectPromptContext({ newUserMessage: "Delete the project Website", strategy: "full" })
                .unsupportedReason
        ).toBeTruthy();
    });
});
