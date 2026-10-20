// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ getOne: vi.fn(), update: vi.fn() }));

vi.mock("../../loaders/companies", () => ({
    CompaniesLoader: { getAll: vi.fn(), create: vi.fn(), getOne: mocks.getOne, update: mocks.update },
}));
vi.mock("../../middleware/roleAccess", () => ({
    requireRoleAccess: () => async (_context: Context, next: () => unknown) => next(),
}));
vi.mock("../../utils/cache", () => ({
    cacheMiddleware: () => async (_context: Context, next: () => unknown) => next(),
}));

import companiesRoutes from "../companies";

function mountCompanies(): Hono {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.route("/api/companies", companiesRoutes);
    return app;
}

it("rejects malformed company IDs before read or update loaders run", async () => {
    vi.clearAllMocks();
    mocks.getOne.mockResolvedValue({ id: "company" });
    mocks.update.mockResolvedValue({ id: "company" });
    const app = mountCompanies();

    const read = await app.request("/api/companies/not-a-uuid");
    const update = await app.request("/api/companies/not-a-uuid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Renamed" }),
    });

    expect(read.status).toBe(400);
    expect(update.status).toBe(400);
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();

    const valid = await app.request("/api/companies/00000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Renamed" }),
    });
    expect(valid.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledOnce();
});
