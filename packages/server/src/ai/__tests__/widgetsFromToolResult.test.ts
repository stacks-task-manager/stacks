// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { widgetsFromToolResult } from "../chat";

const withEnv = (value: string | undefined, fn: () => void) => {
    const orig = process.env.AI_CHAT_AUTO_REDIRECT;
    if (value === undefined) {
        delete process.env.AI_CHAT_AUTO_REDIRECT;
    } else {
        process.env.AI_CHAT_AUTO_REDIRECT = value;
    }
    try {
        fn();
    } finally {
        if (orig === undefined) {
            delete process.env.AI_CHAT_AUTO_REDIRECT;
        } else {
            process.env.AI_CHAT_AUTO_REDIRECT = orig;
        }
    }
};

describe("ai.widgetsFromToolResult", () => {
    it("returns a link widget for createTask", () => {
        const widgets = widgetsFromToolResult("createTask", {
            id: "task-1",
            projectId: "proj-1",
            title: "Hello",
        });
        expect(widgets).toEqual([{ type: "button", label: "Open: Hello", hashPath: "/project/proj-1/task-1" }]);
    });

    it("returns a link widget for createProject", () => {
        const widgets = widgetsFromToolResult("createProject", {
            id: "proj-1",
            title: "New project",
        });
        expect(widgets).toEqual([{ type: "button", label: "Open project: New project", hashPath: "/project/proj-1" }]);
    });

    it("returns a link widget for findTasks", () => {
        const widgets = widgetsFromToolResult("findTasks", {
            hashPath: "/inbox",
        });
        expect(widgets).toEqual([{ type: "button", label: "Show tasks", hashPath: "/inbox" }]);
    });

    it("returns a button widget for navigate when auto redirect is off", () => {
        withEnv(undefined, () => {
            const widgets = widgetsFromToolResult("navigate", {
                hashPath: "/home",
                label: "Open Home",
            });
            expect(widgets).toEqual([{ type: "button", label: "Open Home", hashPath: "/home" }]);
        });
    });

    it("returns a redirect widget for openProfile when auto redirect is on", () => {
        withEnv("true", () => {
            const widgets = widgetsFromToolResult("openProfile", {
                hashPath: "/people/me",
                label: "Open my profile",
            });
            expect(widgets).toEqual([{ type: "redirect", label: "Open my profile", hashPath: "/people/me" }]);
        });
    });
});

