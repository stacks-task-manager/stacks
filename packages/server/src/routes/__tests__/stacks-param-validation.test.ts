// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    getOne: vi.fn(),
    update: vi.fn(),
}));

vi.mock("../../loaders", () => ({
    ProjectsLoader: { removeStackOrder: vi.fn() },
    StacksLoader: { getOne: mocks.getOne, update: mocks.update, remove: vi.fn() },
    TasksLoader: { removeByStack: vi.fn() },
}));

import stacksRoutes from "../stacks";

const mountApi = () => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/stacks", stacksRoutes);
    return app;
};

it("rejects malformed stack IDs before detail or update loaders run", async () => {
    vi.clearAllMocks();
    const app = mountApi();

    const detail = await app.request("/api/stacks/not-a-uuid");
    const update = await app.request("/api/stacks/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Renamed stack" }),
    });

    expect(detail.status).toBe(400);
    expect(update.status).toBe(400);
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
});
