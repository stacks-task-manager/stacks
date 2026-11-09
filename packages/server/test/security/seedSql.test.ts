// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import { sequelize } from "@stacks/db";
import { seedUsers } from "../../src/seed/users";

describe("database seeding SQL", () => {
    afterEach(() => vi.restoreAllMocks());

    it("binds licensed tenant IDs in raw tenant and role lookups", async () => {
        const query = vi.spyOn(sequelize, "query");

        await seedUsers();

        const tenantLookup = query.mock.calls.find(
            ([sql]) => sql === "SELECT * FROM tenants WHERE id = :tenantId"
        );
        const roleLookup = query.mock.calls.find(
            ([sql]) => sql === "SELECT * FROM roles WHERE tenant = :tenantId"
        );

        expect(tenantLookup?.[1]).toEqual({ replacements: { tenantId: expect.any(String) } });
        expect(roleLookup?.[1]).toEqual({ replacements: { tenantId: expect.any(String) } });
    });
});
