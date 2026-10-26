// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    create: vi.fn(),
    getAll: vi.fn(),
    review: vi.fn(),
    updateStatus: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
}));

vi.mock("../../loaders", () => ({ TimelogsLoader: mocks }));

import timelogsRoutes from "../timelogs";

const mountApi = (access: Record<string, unknown> = {}) => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", {
            id: "11111111-1111-4111-8111-111111111111",
            tenant: "tenant-a",
            admin: false,
        } as any);
        c.set("userRole", { access } as any);
        await next();
    });
    app.route("/api/timelogs", timelogsRoutes);
    return app;
};

it("requires timesheet read access for unscoped timelog listings but preserves task/project views", async () => {
    vi.clearAllMocks();
    const app = mountApi();
    mocks.getAll.mockResolvedValue([]);

    const [timesheet, task, project] = await Promise.all([
        app.request("/api/timelogs?start=2026-10-01&end=2026-10-07"),
        app.request("/api/timelogs?task=11111111-1111-4111-8111-111111111111"),
        app.request("/api/timelogs?project=11111111-1111-4111-8111-111111111111"),
    ]);

    expect([timesheet.status, task.status, project.status]).toEqual([403, 200, 200]);
    expect(mocks.getAll).toHaveBeenCalledTimes(2);
});

it("allows unscoped timelog listings when the role grants timesheet read access", async () => {
    vi.clearAllMocks();
    const app = mountApi({ [ROLE_SECTIONS.TIMELOGS]: { [ROLE_ACTIONS.READ]: true } });
    mocks.getAll.mockResolvedValue([]);

    const response = await app.request("/api/timelogs?start=2026-10-01&end=2026-10-07");

    expect(response.status).toBe(200);
    expect(mocks.getAll).toHaveBeenCalledWith({ start: "2026-10-01", end: "2026-10-07" });
});

it("requires timesheet write access for timelog creation, review, approval, updates, and deletion", async () => {
    vi.clearAllMocks();
    const app = mountApi({ [ROLE_SECTIONS.TIMELOGS]: { [ROLE_ACTIONS.READ]: true } });
    const id = "11111111-1111-4111-8111-111111111111";

    const responses = await Promise.all([
        app.request("/api/timelogs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
        }),
        app.request("/api/timelogs/review", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ start: "2026-10-01", end: "2026-10-07" }),
        }),
        app.request("/api/timelogs/approved", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
        }),
        app.request(`/api/timelogs/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: "{}",
        }),
        app.request(`/api/timelogs/${id}`, { method: "DELETE" }),
    ]);

    expect(responses.map(response => response.status)).toEqual([403, 403, 403, 403, 403]);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.review).not.toHaveBeenCalled();
    expect(mocks.updateStatus).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
});
