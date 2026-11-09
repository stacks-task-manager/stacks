// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ getAllByResources: vi.fn() }));

vi.mock("../../loaders/activities", () => ({
    ActivitiesLoader: { getAllByResources: mocks.getAllByResources, create: vi.fn() },
}));

import activitiesRoutes from "../activities";

it("rejects malformed activity resource IDs before listing activities", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/activities", activitiesRoutes);

    const response = await app.request("/api/activities/not-a-uuid");

    expect(response.status).toBe(400);
    expect(mocks.getAllByResources).not.toHaveBeenCalled();
});
