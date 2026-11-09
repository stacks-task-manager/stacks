// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ read: vi.fn(), remove: vi.fn() }));
vi.mock("../../loaders", () => ({ NotificationsLoader: mocks }));

import notificationsRoutes from "../notifications";

function mountNotifications(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/notifications", notificationsRoutes);
    return app;
}

it("rejects malformed notification IDs before mark-read or delete loaders run", async () => {
    vi.clearAllMocks();
    mocks.read.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    const app = mountNotifications();

    const read = await app.request("/api/notifications/not-a-uuid", { method: "PATCH" });
    const remove = await app.request("/api/notifications/not-a-uuid", { method: "DELETE" });

    expect(read.status).toBe(400);
    expect(remove.status).toBe(400);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();

    const valid = await app.request("/api/notifications/00000000-0000-4000-8000-000000000001", {
        method: "PATCH",
    });
    expect(valid.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
});
