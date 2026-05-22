// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { clientRouteTemplateVars, parseClientRoute } from "../clientRoute";

describe("parseClientRoute", () => {
    it("parses person overlay route (section + sectionId)", () => {
        const r = parseClientRoute({
            section: "person",
            sectionId: "bb113cbf-79a1-4711-880d-65b5647875a5",
        });
        expect(r.viewKind).toBe("Person profile");
        expect(r.personId).toBe("bb113cbf-79a1-4711-880d-65b5647875a5");
        expect(r.summary).toContain("person id");
    });

    it("parses project with viewType", () => {
        const r = parseClientRoute({
            section: "project",
            sectionId: "p1",
            viewType: "board",
        });
        expect(r.projectId).toBe("p1");
        expect(r.viewKind).toContain("Project");
    });

    it("parses inbox task", () => {
        const r = parseClientRoute({ section: "inbox", sectionId: "task-uuid" });
        expect(r.taskId).toBe("task-uuid");
    });
});

describe("clientRouteTemplateVars", () => {
    it("maps summary to viewSummary for Handlebars templates", () => {
        const v = clientRouteTemplateVars({
            section: "person",
            sectionId: "abc",
        });
        expect(v.hasClientRoute).toBe(true);
        expect(v.viewSummary.length).toBeGreaterThan(0);
        expect(v.personId).toBe("abc");
        expect(v.routeSection).toBe("person");
        expect(v.inferredIdsSection).toContain("Person id");
        expect(v.inferredIdsSection).toContain("abc");
    });

    it("builds inferredIdsSection for project routes", () => {
        const v = clientRouteTemplateVars({
            section: "project",
            sectionId: "proj-1",
            viewType: "board",
        });
        expect(v.inferredIdsSection).toContain("proj-1");
        expect(v.inferredIdsSection).toContain("createProject");
    });
});
