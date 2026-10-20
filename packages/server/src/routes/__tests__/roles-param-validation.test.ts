// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../loaders", () => ({ RolesLoader: mocks }));

import rolesRoutes from "../roles";

function mountRoles(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/roles", rolesRoutes);
    return app;
}

it("rejects malformed role IDs before update and allows a valid ID through", async () => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({ id: "role" });
    const app = mountRoles();
    const headers = { "Content-Type": "application/json" };
    const body = JSON.stringify({ title: "Editor", access: { projects: { view: true } } });

    const invalid = await app.request("/api/roles/not-a-uuid", { method: "PATCH", headers, body });
    expect(invalid.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();

    const valid = await app.request("/api/roles/00000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers,
        body,
    });
    expect(valid.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledOnce();
});
