// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { WorkbookCreateSchema, WorkbookUpdateSchema } from "../schema/workbook";

const id = "11111111-1111-4111-8111-111111111111";
const filters = {
    projects: [],
    tags: [],
    statuses: [],
    state: "todo",
    assignees: [],
    overdue: false,
    inProgress: false,
};

describe("workbook route schemas", () => {
    it("accepts a workbook with a full initial ACL", () => {
        expect(
            WorkbookCreateSchema.safeParse({
                title: "  Delivery  ",
                filters,
                permissions: {
                    isPublic: false,
                    owner: id,
                    visibleUsers: [id],
                    visibleRoles: [],
                },
            })
        ).toMatchObject({ success: true, data: { title: "Delivery" } });
    });

    it("rejects unknown filter fields", () => {
        expect(
            WorkbookCreateSchema.safeParse({
                title: "Delivery",
                filters: { ...filters, query: "not persisted" },
                permissions: { isPublic: true, visibleUsers: [], visibleRoles: [] },
            }).success
        ).toBe(false);
    });

    it("requires at least one update field", () => {
        expect(WorkbookUpdateSchema.safeParse({}).success).toBe(false);
        expect(WorkbookUpdateSchema.safeParse({ title: "Renamed" }).success).toBe(true);
    });
});
