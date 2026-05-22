// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { Op } from "sequelize";
import { sanitizeWhere, sanitizeWherePermissions, sanitizeWhereDelete } from "../utils";
import { requestContext } from "../../services/requestContext";
import type { User } from "../../types";

const baseContext = (overrides: Partial<User> = {}) => ({
    user: {
        id: "user-1",
        tenant: "tenant-1",
        role: "role-1",
        admin: false,
        email: "u@example.com",
        name: "U",
        ...overrides,
    } as User,
    instanceId: "instance-1",
    role: { id: "role-1", title: "r", access: {} } as any,
    requestId: "req-1",
    timestamp: Date.now(),
});

const sqlOf = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value.val === "string") return value.val;
    return JSON.stringify(value);
};

describe("loader sanitizeWhere helpers", () => {
    it("scopes WHERE to tenant and non-deleted rows", () => {
        requestContext.run(baseContext(), () => {
            const where: any = sanitizeWhere({ id: "x" });
            expect(where.id).toBe("x");
            expect(where.tenant).toBe("tenant-1");
            expect(where.deleted).toBeNull();
        });
    });

    it("admin users skip the permission OR clause", () => {
        requestContext.run(baseContext({ admin: true }), () => {
            const where: any = sanitizeWherePermissions({ id: "x" });
            expect(where[Op.or]).toBeUndefined();
        });
    });

    it("non-admin users get isPublic/owner/role/user/fallback OR clause", () => {
        requestContext.run(baseContext(), () => {
            const where: any = sanitizeWherePermissions({}, true);
            const clauses = where[Op.or] as any[];
            expect(clauses).toHaveLength(5);
            const sqls = clauses.map(sqlOf).join(" | ");
            expect(sqls).toContain('"PermissionEntity"."isPublic" = true');
            expect(sqls).toContain('"PermissionEntity"."owner"');
            expect(sqls).toContain('"PermissionEntity"."visibleRoles" ?');
            expect(sqls).toContain('"PermissionEntity"."visibleUsers" ?');
            expect(sqls).toContain('"PermissionEntity"."id" IS NULL');
        });
    });

    it("delete visibility is restricted to public or owner", () => {
        requestContext.run(baseContext(), () => {
            const where: any = sanitizeWhereDelete({ id: "x" }, true);
            const clauses = where[Op.or] as any[];
            expect(clauses).toHaveLength(2);
            const sqls = clauses.map(sqlOf).join(" | ");
            expect(sqls).toContain('"PermissionEntity"."isPublic" = true');
            expect(sqls).toContain('"PermissionEntity"."owner"');
        });
    });
});
