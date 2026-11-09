// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    update: vi.fn(),
    remove: vi.fn(),
}));

vi.mock("../../loaders/documents", () => ({
    DocumentsLoader: {
        create: vi.fn(),
        getAll: vi.fn(),
        update: mocks.update,
        remove: mocks.remove,
    },
}));
vi.mock("../../loaders/tags", () => ({ TagsLoader: { getAll: vi.fn() } }));

import documentsRoutes from "../documents";

it("rejects malformed document IDs before update, archive, or delete loaders run", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/documents", documentsRoutes);

    const update = await app.request("/api/documents/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Renamed document" }),
    });
    const archive = await app.request("/api/documents/not-a-uuid/archive", { method: "POST" });
    const unarchive = await app.request("/api/documents/not-a-uuid/unarchive", { method: "POST" });
    const remove = await app.request("/api/documents/not-a-uuid", { method: "DELETE" });

    expect(update.status).toBe(400);
    expect(archive.status).toBe(400);
    expect(unarchive.status).toBe(400);
    expect(remove.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
});
