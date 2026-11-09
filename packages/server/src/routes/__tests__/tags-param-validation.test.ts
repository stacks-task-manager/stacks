// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock("../../loaders", () => ({
    TagsLoader: { create: vi.fn(), getAll: vi.fn(), update: mocks.update },
}));

import tagsRoutes from "../tags";

it("rejects malformed tag update IDs before the loader runs", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/tags", tagsRoutes);

    const response = await app.request("/api/tags/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Renamed tag",
            color: "#123456",
            section: "projects",
            type: "tag",
        }),
    });

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
});
