// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findAllMock, findOneMock, updateMock } = vi.hoisted(() => ({
    createMock: vi.fn(),
    findAllMock: vi.fn(),
    findOneMock: vi.fn(),
    updateMock: vi.fn(),
}));

vi.mock("@stacks/db", () => ({
    CompanyEntity: {
        create: createMock,
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

const runAs = <T>(tenant: string, fn: () => T, access: Record<string, unknown> = {}) =>
    requestContext.run(
        {
            user: { id: `user-${tenant}`, tenant },
            role: { id: "role-1", title: "User", access },
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
        createMock.mockImplementation(async data => ({ toJSON: () => data }));

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
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(rows.get(companyId)?.notes).toBe("B-only note");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("allows the owning tenant to read and update its company", async () => {
        expect(await runAs("tenant-b", () => CompaniesLoader.getOne(companyId))).toMatchObject({
            notes: "B-only note",
        });
        const access = { companies: { write: true } };
        expect(
            await runAs("tenant-b", () => CompaniesLoader.update(companyId, { notes: "changed" }), access)
        ).toBe(true);
        expect(rows.get(companyId)?.notes).toBe("changed");
        await expect(
            runAs("tenant-b", () => CompaniesLoader.create({ title: "new company" }), access)
        ).resolves.toMatchObject({ title: "new company" });
    });

    it("denies same-tenant users without company write access from creating or updating", async () => {
        await expect(
            runAs("tenant-b", () => CompaniesLoader.update(companyId, { notes: "unauthorized" }))
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            runAs("tenant-b", () => CompaniesLoader.create({ title: "unauthorized company" }))
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(updateMock).not.toHaveBeenCalled();
        expect(createMock).not.toHaveBeenCalled();
        expect(rows.get(companyId)?.notes).toBe("B-only note");
    });

    it("does not reveal company existence to users without company write access", async () => {
        const forbiddenCompanyUpdate = runAs("tenant-b", () =>
            CompaniesLoader.update(companyId, { notes: "unauthorized" })
        );
        const unknownCompanyUpdate = runAs("tenant-b", () =>
            CompaniesLoader.update("22222222-2222-4222-8222-222222222222", { notes: "unauthorized" })
        );

        await expect(forbiddenCompanyUpdate).rejects.toMatchObject({ statusCode: 403 });
        await expect(unknownCompanyUpdate).rejects.toMatchObject({ statusCode: 403 });
        expect(updateMock).not.toHaveBeenCalled();
        expect(rows.get(companyId)?.notes).toBe("B-only note");
    });
});
