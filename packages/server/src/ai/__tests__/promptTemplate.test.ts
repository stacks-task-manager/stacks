// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { template } from "../promptTemplate";

describe("promptTemplate", () => {
    it("interpolates variables from system-core.md", () => {
        const out = template("system-core", {
            todaysDate: "Mon Jan 1 2024",
            todaysDateISO: "2024-01-01T00:00:00.000Z",
        });
        expect(out).toContain("Mon Jan 1 2024");
        expect(out).toContain("2024-01-01T00:00:00.000Z");
        expect(out).toContain("navigate");
    });

    it("accepts .md suffix in name", () => {
        const out = template("system-core.md", { todaysDate: "x", todaysDateISO: "y" });
        expect(out).toContain("x");
        expect(out).toContain("y");
    });

    it("topic fragment references tools consistent with promptContext allowlist", () => {
        const tasks = template("system-tasks.md", { currentUserId: "u-1" });
        expect(tasks).toContain("findTasks");
        expect(tasks).toContain("listTasks");
        expect(tasks).toContain("moveTask");
        expect(tasks).toContain("u-1");
    });

    it("collapses excessive blank lines from templates", () => {
        const out = template("system-core", {
            todaysDate: "d",
            todaysDateISO: "i",
        });
        expect(out).not.toMatch(/\n{3,}/);
    });

    it("renders client-ui-context without large blank gaps when ids are omitted", () => {
        const out = template("client-ui-context", {
            hasClientRoute: true,
            routeSection: "home",
            viewKind: "Home",
            viewSummary: "The user is on the home dashboard.",
            inferredIdsSection: "",
        });
        expect(out).toContain("home");
        expect(out).not.toMatch(/\n{3,}/);
    });
});
