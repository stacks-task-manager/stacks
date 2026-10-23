// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ getAll: vi.fn(), remove: vi.fn() }));
vi.mock("../../loaders", () => ({ RemindersLoader: mocks }));

import remindersRoutes from "../reminders";

function mountReminders(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/reminders", remindersRoutes);
    return app;
}

it("rejects malformed reminder record and item IDs before loaders run", async () => {
    vi.clearAllMocks();
    mocks.getAll.mockResolvedValue([]);
    mocks.remove.mockResolvedValue(true);
    const app = mountReminders();

    const list = await app.request("/api/reminders/not-a-uuid");
    const remove = await app.request("/api/reminders/not-a-uuid", { method: "DELETE" });

    expect(list.status).toBe(400);
    expect(remove.status).toBe(400);
    expect(mocks.getAll).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();

    const valid = await app.request("/api/reminders/00000000-0000-4000-8000-000000000001");
    expect(valid.status).toBe(200);
    expect(mocks.getAll).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
});
