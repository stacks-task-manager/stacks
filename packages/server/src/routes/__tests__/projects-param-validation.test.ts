// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ archiveCompletedTasks: vi.fn() }));

vi.mock("../../loaders/projects", () => ({
    ProjectsLoader: { archiveCompletedTasks: mocks.archiveCompletedTasks },
}));
vi.mock("../../loaders/stacks", () => ({ StacksLoader: {} }));
vi.mock("../../loaders/tasks", () => ({ TasksLoader: {} }));
vi.mock("../../loaders", () => ({ TimelogsLoader: {} }));

import projectsRoutes from "../projects";

it("rejects malformed project IDs before bulk archiving completed tasks", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/projects", projectsRoutes);

    const response = await app.request("/api/projects/not-a-uuid/archive-completed", {
        method: "POST",
    });

    expect(response.status).toBe(400);
    expect(mocks.archiveCompletedTasks).not.toHaveBeenCalled();
});
