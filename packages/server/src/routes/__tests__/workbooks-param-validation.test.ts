// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    getTasks: vi.fn(),
    remove: vi.fn(),
}));

vi.mock("../../loaders", () => ({
    WorkbooksLoader: {
        getAll: vi.fn(),
        create: vi.fn(),
        getOne: vi.fn(),
        update: vi.fn(),
        getTasks: mocks.getTasks,
        remove: mocks.remove,
    },
}));

import workbooksRoutes from "../workbooks";

function app() {
    const value = new Hono();
    registerResponseHelpers(value);
    value.onError(errorHandler);
    value.route("/api/workbooks", workbooksRoutes);
    return value;
}

it("rejects malformed workbook IDs before loading tasks or deleting", async () => {
    vi.clearAllMocks();
    const server = app();

    expect((await server.request("/api/workbooks/not-a-uuid/tasks")).status).toBe(400);
    expect((await server.request("/api/workbooks/not-a-uuid", { method: "DELETE" })).status).toBe(400);
    expect(mocks.getTasks).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
});

it("loads the workbook task set without forwarding a client search query", async () => {
    vi.clearAllMocks();
    mocks.getTasks.mockResolvedValue([]);
    const id = "11111111-1111-4111-8111-111111111111";
    const server = app();

    const response = await server.request(`/api/workbooks/${id}/tasks?q=release`);

    expect(response.status).toBe(200);
    expect(mocks.getTasks).toHaveBeenCalledWith(id);
});
