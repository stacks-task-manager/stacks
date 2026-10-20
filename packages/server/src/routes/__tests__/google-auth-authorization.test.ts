// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    getAuthUrl: vi.fn(),
    getTokens: vi.fn(),
    storeTokens: vi.fn(),
    hasValidTokens: vi.fn(),
    removeTokens: vi.fn(),
    getCalendars: vi.fn(),
}));

vi.mock("../../middleware/auth", () => ({
    requireAuth: async (_c: unknown, next: () => Promise<void>) => next(),
}));
vi.mock("../../services/googleOAuthService", () => ({ default: mocks }));

import googleAuthRoutes from "../googleAuth";

const mountApi = (access: Record<string, unknown> = {}) => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", { id: "viewer-id", tenant: "tenant-a", admin: false } as any);
        c.set("userTenant", "tenant-a");
        c.set("sid", "session-1");
        c.set("userRole", { access } as any);
        await next();
    });
    app.route("/api/google", googleAuthRoutes);
    return app;
};

it("denies Google calendar status and listing without calendar read access", async () => {
    vi.clearAllMocks();
    const app = mountApi();

    const status = await app.request("/api/google/status");
    const calendars = await app.request("/api/google/calendars");

    expect(status.status).toBe(403);
    expect(calendars.status).toBe(403);
    expect(mocks.hasValidTokens).not.toHaveBeenCalled();
    expect(mocks.getCalendars).not.toHaveBeenCalled();
});

it("denies Google calendar connection and disconnection without calendar write access", async () => {
    vi.clearAllMocks();
    const app = mountApi({ [ROLE_SECTIONS.CALENDAR]: { [ROLE_ACTIONS.READ]: true } });

    const responses = await Promise.all([
        app.request("/api/google/auth-url"),
        app.request("/api/google/callback"),
        app.request("/api/google/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: "code", state: "state" }),
        }),
        app.request("/api/google/disconnect", { method: "POST" }),
        app.request("/api/google/disconnect", { method: "DELETE" }),
    ]);

    expect(responses.map(response => response.status)).toEqual(Array(5).fill(403));
    expect(mocks.getAuthUrl).not.toHaveBeenCalled();
    expect(mocks.getTokens).not.toHaveBeenCalled();
    expect(mocks.storeTokens).not.toHaveBeenCalled();
    expect(mocks.removeTokens).not.toHaveBeenCalled();
});
