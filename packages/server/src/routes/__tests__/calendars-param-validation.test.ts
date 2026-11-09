// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    getOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
}));

vi.mock("../../loaders", () => ({
    CalendarsLoader: {
        getAll: vi.fn(),
        create: vi.fn(),
        getOne: mocks.getOne,
        update: mocks.update,
        remove: mocks.remove,
    },
}));

import calendarsRoutes from "../calendars";

it("rejects malformed calendar IDs before detail, update, or delete loaders run", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", { id: "admin-id", tenant: "tenant-a", admin: true } as any);
        c.set("userRole", { access: {} } as any);
        await next();
    });
    app.route("/api/calendars", calendarsRoutes);

    const detail = await app.request("/api/calendars/not-a-uuid");
    const update = await app.request("/api/calendars/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Renamed calendar" }),
    });
    const remove = await app.request("/api/calendars/not-a-uuid", { method: "DELETE" });

    expect(detail.status).toBe(400);
    expect(update.status).toBe(400);
    expect(remove.status).toBe(400);
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
});
