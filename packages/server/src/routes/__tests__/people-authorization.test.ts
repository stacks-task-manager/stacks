// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { ROLE_SECTIONS } from "@stacks/types";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({ getAll: vi.fn(), getOne: vi.fn() }));

vi.mock("../../loaders", () => ({
    EmailsLoader: {},
    PeopleLoader: { getAll: mocks.getAll, getOne: mocks.getOne },
}));

import peopleRoutes from "../people";

it("denies people directory and birthday reads without people read access", async () => {
    vi.clearAllMocks();
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", {
            id: "11111111-1111-4111-8111-111111111111",
            tenant: "tenant-a",
            admin: false,
        } as any);
        c.set("userRole", { access: { [ROLE_SECTIONS.PEOPLE]: { read: false, write: false } } } as any);
        await next();
    });
    app.route("/api/people", peopleRoutes);

    const list = await app.request("/api/people");
    const birthdays = await app.request(
        "/api/people/birthdays?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.000Z"
    );
    const otherPerson = await app.request("/api/people/22222222-2222-4222-8222-222222222222");
    mocks.getOne.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    const self = await app.request("/api/people/11111111-1111-4111-8111-111111111111");

    expect(list.status).toBe(403);
    expect(birthdays.status).toBe(403);
    expect(otherPerson.status).toBe(403);
    expect(self.status).toBe(200);
    expect(mocks.getAll).not.toHaveBeenCalled();
    expect(mocks.getOne).toHaveBeenCalledTimes(1);
});
