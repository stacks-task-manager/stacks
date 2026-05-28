// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import { errorHandler } from "../../src/utils/errorHandler";
import { registerResponseHelpers } from "../../src/services/response";
import { requireRoleAccess } from "../../src/middleware/roleAccess";

const ROLE_SECTIONS = {
    PROJECT: "project",
    TASK: "task",
    STACK: "stack",
    PERSON: "person",
    COMPANY: "company",
    DOCUMENT: "document",
    TIMELONG: "timelong",
    EVENT: "event",
    NOTEPAD: "notepad",
    TAG: "tag",
    ACTIVITY: "activity",
    REMINDER: "reminder",
    BOOKMARK: "bookmark",
    STATUS: "status",
    REPORT: "report",
    EMAIL: "email",
    FILE: "file",
    PERMISSION: "permission",
    PREFERENCE: "preference",
    USER: "user",
    ROLE: "role",
    TENANT: "tenant",
    SEARCH: "search",
    INBOX: "inbox",
    ADMIN: "admin",
} as const;

const ROLE_ACTIONS = {
    READ: "read",
    WRITE: "write",
    DELETE: "delete",
    ADMIN: "admin",
} as const;

describe("requireRoleAccess middleware", () => {
    test("returns 401 when user is not authenticated", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.use("*", requireRoleAccess(ROLE_SECTIONS.PROJECT, ROLE_ACTIONS.READ));
        app.get("/test", c => c.text("ok"));

        const res = await app.request("/test");
        expect(res.status).toBe(401);
        const body = (await res.json()) as { success: boolean; code?: string };
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
    });

    test("passes through for admin users", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.use("*", async (c, next) => {
            c.set("user", { id: "u1", admin: true });
            c.set("userRole", { admin: true, title: "Admin" });
            await next();
        });
        app.use("*", requireRoleAccess(ROLE_SECTIONS.PROJECT, ROLE_ACTIONS.DELETE));
        app.get("/test", c => c.text("admin-ok"));

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("admin-ok");
    });

    test("passes when user role has the required section+action", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.use("*", async (c, next) => {
            c.set("user", { id: "u1" });
            c.set("userRole", {
                access: {
                    project: { read: true, write: true },
                },
            });
            await next();
        });
        app.use("*", requireRoleAccess(ROLE_SECTIONS.PROJECT, ROLE_ACTIONS.READ));
        app.get("/test", c => c.text("allowed"));

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("allowed");
    });

    test("returns 403 when role lacks the required action", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.use("*", async (c, next) => {
            c.set("user", { id: "u1" });
            c.set("userRole", {
                access: {
                    project: { read: true }, // no write
                },
            });
            await next();
        });
        app.use("*", requireRoleAccess(ROLE_SECTIONS.PROJECT, ROLE_ACTIONS.WRITE));
        app.get("/test", c => c.text("should-not-reach"));

        const res = await app.request("/test");
        expect(res.status).toBe(403);
        const body = (await res.json()) as { success: boolean; code?: string };
        expect(body.success).toBe(false);
        expect(body.code).toBe("FORBIDDEN");
    });

    test("returns 403 when role has no access for the section", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.use("*", async (c, next) => {
            c.set("user", { id: "u1" });
            c.set("userRole", {
                access: {
                    task: { read: true }, // no project section
                },
            });
            await next();
        });
        app.use("*", requireRoleAccess(ROLE_SECTIONS.PROJECT, ROLE_ACTIONS.READ));
        app.get("/test", c => c.text("should-not-reach"));

        const res = await app.request("/test");
        expect(res.status).toBe(403);
        const body = (await res.json()) as { success: boolean; code?: string };
        expect(body.success).toBe(false);
        expect(body.code).toBe("FORBIDDEN");
    });

    test("passes with default action (read) when none specified", async () => {
        const app = new Hono();
        registerResponseHelpers(app);
        app.onError((err, c) => errorHandler(err, c));
        app.use("*", async (c, next) => {
            c.set("user", { id: "u1" });
            c.set("userRole", {
                access: {
                    project: { read: true },
                },
            });
            await next();
        });
        // No action specified → defaults to READ
        app.use("*", requireRoleAccess(ROLE_SECTIONS.PROJECT));
        app.get("/test", c => c.text("default-read"));

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("default-read");
    });
});
