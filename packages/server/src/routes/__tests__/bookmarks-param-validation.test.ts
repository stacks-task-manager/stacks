// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ remove: vi.fn() }));

vi.mock("../../loaders/bookmarks", () => ({
    BookmarksLoader: { getAll: vi.fn(), create: vi.fn(), remove: mocks.remove },
}));

import bookmarksRoutes from "../bookmarks";

it("rejects malformed bookmark deletion IDs before the loader runs", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/bookmarks", bookmarksRoutes);

    const response = await app.request("/api/bookmarks/not-a-uuid", { method: "DELETE" });

    expect(response.status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
});
