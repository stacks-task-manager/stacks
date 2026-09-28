// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findAllMock, findOneMock, updateMock } = vi.hoisted(() => ({
    findAllMock: vi.fn(),
    findOneMock: vi.fn(),
    updateMock: vi.fn(),
}));

vi.mock("@stacks/db", () => ({
    CompanyEntity: {
        findAll: findAllMock,
        findOne: findOneMock,
        update: updateMock,
    },
}));

vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));

import { CompaniesLoader } from "../companies";
import { requestContext } from "../../services/requestContext";

const companyId = "11111111-1111-4111-8111-111111111111";
const rows = new Map<string, { id: string; tenant: string; deleted: null; notes: string }>();

const runAs = <T>(tenant: string, fn: () => T) =>
    requestContext.run(
        {
            user: { id: `user-${tenant}`, tenant },
            role: { id: "role-1", title: "User", access: {} },
            instanceId: "instance-1",
            requestId: "request-1",
            timestamp: Date.now(),
        } as any,
        fn
    );

describe("CompaniesLoader tenant isolation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        rows.clear();
        rows.set(companyId, { id: companyId, tenant: "tenant-b", deleted: null, notes: "B-only note" });

        findAllMock.mockImplementation(async ({ where }) =>
            [...rows.values()]
                .filter(row => row.tenant === where.tenant && row.deleted === where.deleted)
                .map(row => ({ toJSON: () => ({ ...row }) }))
        );
        findOneMock.mockImplementation(async ({ where }) => {
            const row = rows.get(where.id);
            return row && row.tenant === where.tenant && row.deleted === where.deleted
                ? { toJSON: () => ({ ...row }) }
                : null;
        });
        updateMock.mockImplementation(async (data, { where }) => {
            const row = rows.get(where.id);
            if (!row || row.tenant !== where.tenant || row.deleted !== where.deleted) return [0];
            Object.assign(row, data);
            return [1];
        });
    });

    it("keeps a foreign company out of the list and denies known-ID reads and writes", async () => {
        expect(await runAs("tenant-a", () => CompaniesLoader.getAll())).toEqual([]);
        await expect(runAs("tenant-a", () => CompaniesLoader.getOne(companyId))).rejects.toMatchObject({
            statusCode: 404,
        });
        await expect(
            runAs("tenant-a", () => CompaniesLoader.update(companyId, { notes: "changed" }))
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(rows.get(companyId)?.notes).toBe("B-only note");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("allows the owning tenant to read and update its company", async () => {
        expect(await runAs("tenant-b", () => CompaniesLoader.getOne(companyId))).toMatchObject({
            notes: "B-only note",
        });
        expect(await runAs("tenant-b", () => CompaniesLoader.update(companyId, { notes: "changed" }))).toBe(
            true
        );
        expect(rows.get(companyId)?.notes).toBe("changed");
    });
});
