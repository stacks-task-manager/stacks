// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ getOne: vi.fn(), update: vi.fn() }));
vi.mock("../../loaders/notepads", () => ({ NotepadsLoader: mocks }));

import notepadsRoutes from "../notepads";

function mountNotepads(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/notepads", notepadsRoutes);
    return app;
}

it("rejects malformed notepad IDs before read or update loaders run", async () => {
    vi.clearAllMocks();
    mocks.getOne.mockResolvedValue({ id: "notepad" });
    mocks.update.mockResolvedValue(undefined);
    const app = mountNotepads();

    const read = await app.request("/api/notepads/not-a-uuid");
    const update = await app.request("/api/notepads/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
    });

    expect(read.status).toBe(400);
    expect(update.status).toBe(400);
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();

    const valid = await app.request("/api/notepads/00000000-0000-4000-8000-000000000001");
    expect(valid.status).toBe(200);
    expect(mocks.getOne).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
});
