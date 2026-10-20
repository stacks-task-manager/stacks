// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    update: vi.fn(),
    remove: vi.fn(),
}));

vi.mock("../../loaders", () => ({
    TimelogsLoader: {
        create: vi.fn(),
        getAll: vi.fn(),
        review: vi.fn(),
        updateStatus: vi.fn(),
        update: mocks.update,
        remove: mocks.remove,
    },
}));

import timelogsRoutes from "../timelogs";

it("rejects malformed timelog update and delete IDs before loader calls", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", { id: "11111111-1111-4111-8111-111111111111", tenant: "tenant-a", admin: true } as any);
        c.set("userRole", { access: {} } as any);
        await next();
    });
    app.route("/api/timelogs", timelogsRoutes);

    const update = await app.request("/api/timelogs/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            date: "2026-10-18T12:00:00.000Z",
            person: "11111111-1111-4111-8111-111111111111",
            project: "22222222-2222-4222-8222-222222222222",
            task: "33333333-3333-4333-8333-333333333333",
            description: "Work",
            duration: 60,
        }),
    });
    const remove = await app.request("/api/timelogs/not-a-uuid", { method: "DELETE" });

    expect(update.status).toBe(400);
    expect(remove.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
});
