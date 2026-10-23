// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    getAll: vi.fn(),
    getOne: vi.fn(),
}));

vi.mock("../../loaders/companies", () => ({
    CompaniesLoader: {
        getAll: mocks.getAll,
        getOne: mocks.getOne,
    },
}));
vi.mock("../../utils/cache", () => ({
    cacheMiddleware: () => async (_context: Context, next: () => unknown) => next(),
}));

import companiesRoutes from "../companies";

const mountApi = (access: Record<string, unknown> = {}) => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", { id: "viewer-id", tenant: "tenant-a", admin: false } as any);
        c.set("userRole", { access } as any);
        await next();
    });
    app.route("/api/companies", companiesRoutes);
    return app;
};

it("denies company list and detail reads without company read access", async () => {
    vi.clearAllMocks();
    const app = mountApi();

    const list = await app.request("/api/companies");
    const detail = await app.request("/api/companies/11111111-1111-4111-8111-111111111111");

    expect(list.status).toBe(403);
    expect(detail.status).toBe(403);
    expect(mocks.getAll).not.toHaveBeenCalled();
    expect(mocks.getOne).not.toHaveBeenCalled();
});

it("allows company list and detail reads with company read access", async () => {
    vi.clearAllMocks();
    const id = "11111111-1111-4111-8111-111111111111";
    mocks.getAll.mockResolvedValue([{ id }]);
    mocks.getOne.mockResolvedValue({ id });
    const app = mountApi({ companies: { read: true } });

    const list = await app.request("/api/companies");
    const detail = await app.request(`/api/companies/${id}`);

    expect(list.status).toBe(200);
    expect(detail.status).toBe(200);
    expect(mocks.getAll).toHaveBeenCalledOnce();
    expect(mocks.getOne).toHaveBeenCalledWith(id);
});
