// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { ROLE_SECTIONS } from "@stacks/types";
import { requestContext } from "../../services/requestContext";

const mocks = vi.hoisted(() => ({
    getAllCompanies: vi.fn(),
    getOneCompany: vi.fn(),
}));

vi.mock("../../loaders", () => ({
    BookmarksLoader: { getAll: vi.fn() },
    CompaniesLoader: { getAll: mocks.getAllCompanies, getOne: mocks.getOneCompany },
    TagsLoader: { getAll: vi.fn() },
}));

import { orgAiTools } from "../toolRegistry/orgTools";

const runAs = <T>(fn: () => T, access: Record<string, unknown> = {}) =>
    requestContext.run(
        {
            user: { id: "viewer-id", tenant: "tenant-a", admin: false } as any,
            role: { id: "role-1", title: "Viewer", access } as any,
            instanceId: "test",
            requestId: "request-1",
            timestamp: Date.now(),
        },
        fn
    );

it("denies company AI tools without company read access", async () => {
    vi.clearAllMocks();
    const listCompanies = orgAiTools.find(tool => tool.name === "listCompanies")!;
    const getCompany = orgAiTools.find(tool => tool.name === "getCompany")!;

    await expect(runAs(() => listCompanies.execute({}))).rejects.toMatchObject({ statusCode: 403 });
    await expect(
        runAs(() => getCompany.execute({ companyId: "11111111-1111-4111-8111-111111111111" }))
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.getAllCompanies).not.toHaveBeenCalled();
    expect(mocks.getOneCompany).not.toHaveBeenCalled();
});

it("allows company AI tools when the role has company read access", async () => {
    vi.clearAllMocks();
    mocks.getAllCompanies.mockResolvedValue([{ id: "company-1", title: "Example" }]);
    mocks.getOneCompany.mockResolvedValue({ id: "company-1", title: "Example" });
    const listCompanies = orgAiTools.find(tool => tool.name === "listCompanies")!;
    const getCompany = orgAiTools.find(tool => tool.name === "getCompany")!;
    const access = { [ROLE_SECTIONS.COMPANIES]: { read: true } };

    await expect(runAs(() => listCompanies.execute({}), access)).resolves.toBeDefined();
    await expect(runAs(() => getCompany.execute({ companyId: "company-1" }), access)).resolves.toBeDefined();
    expect(mocks.getAllCompanies).toHaveBeenCalled();
    expect(mocks.getOneCompany).toHaveBeenCalledWith("company-1");
});
