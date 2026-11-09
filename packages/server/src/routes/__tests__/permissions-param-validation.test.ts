// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../loaders/permissions", () => ({ PermissionsLoader: mocks }));

import permissionsRoutes from "../permissions";

function mountPermissions(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/permissions", permissionsRoutes);
    return app;
}

it("rejects malformed permission IDs before update and allows a valid ID through", async () => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({ id: "permission" });
    const app = mountPermissions();
    const body = JSON.stringify({ isPublic: true });
    const headers = { "Content-Type": "application/json" };

    const invalid = await app.request("/api/permissions/not-a-uuid", { method: "PATCH", headers, body });
    expect(invalid.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();

    const valid = await app.request("/api/permissions/00000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers,
        body,
    });
    expect(valid.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledOnce();
});
