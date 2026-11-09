// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { ROLE_SECTIONS } from "@stacks/types";
import { requestContext } from "../../services/requestContext";

const mocks = vi.hoisted(() => ({ getOne: vi.fn(), getAllWithCount: vi.fn(), getRoles: vi.fn() }));

vi.mock("../../loaders", () => ({
    PeopleLoader: { getOne: mocks.getOne, getAllWithCount: mocks.getAllWithCount },
    RolesLoader: { getAll: mocks.getRoles },
}));

import { peopleAiTools } from "../toolRegistry/peopleTools";

const runAsDirectoryDenied = <T>(fn: () => T) =>
    requestContext.run(
        {
            user: { id: "viewer-id", tenant: "tenant-a", admin: false } as any,
            role: { id: "role-1", title: "Viewer", access: {} } as any,
            instanceId: "test",
            requestId: "request-1",
            timestamp: Date.now(),
        },
        fn
    );

const runAsDirectoryReader = <T>(fn: () => T) =>
    requestContext.run(
        {
            user: { id: "viewer-id", tenant: "tenant-a", admin: false } as any,
            role: {
                id: "role-1",
                title: "Directory Reader",
                access: { [ROLE_SECTIONS.PEOPLE]: { read: true } },
            } as any,
            instanceId: "test",
            requestId: "request-2",
            timestamp: Date.now(),
        },
        fn
    );

it("denies person AI reads when the role cannot read the people directory", async () => {
    vi.clearAllMocks();
    mocks.getOne.mockResolvedValue({ role: null });
    mocks.getAllWithCount.mockResolvedValue({ total: 0, rows: [] });
    mocks.getRoles.mockResolvedValue([]);
    const getPerson = peopleAiTools.find(tool => tool.name === "getPerson")!;
    const searchPeople = peopleAiTools.find(tool => tool.name === "searchPeople")!;
    const openProfile = peopleAiTools.find(tool => tool.name === "openProfile")!;

    await expect(
        runAsDirectoryDenied(() => getPerson.execute({ personId: "11111111-1111-4111-8111-111111111111" }))
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(runAsDirectoryDenied(() => searchPeople.execute({ query: "Ada" }))).rejects.toMatchObject({
        statusCode: 403,
    });
    await expect(
        runAsDirectoryDenied(() => openProfile.execute({ personId: "11111111-1111-4111-8111-111111111111" }))
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(runAsDirectoryDenied(() => openProfile.execute({}))).resolves.toMatchObject({
        isSelf: true,
    });
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.getAllWithCount).not.toHaveBeenCalled();
    expect(mocks.getRoles).not.toHaveBeenCalled();
});

it("allows person AI reads when the role can read the people directory", async () => {
    vi.clearAllMocks();
    const person = { id: "person-1", firstName: "Ada", lastName: "Lovelace" };
    mocks.getOne.mockResolvedValue(person);
    mocks.getAllWithCount.mockResolvedValue({ total: 1, rows: [person] });
    mocks.getRoles.mockResolvedValue([]);
    const getPerson = peopleAiTools.find(tool => tool.name === "getPerson")!;
    const searchPeople = peopleAiTools.find(tool => tool.name === "searchPeople")!;

    await expect(
        runAsDirectoryReader(() => getPerson.execute({ personId: person.id }))
    ).resolves.toMatchObject({ roleTitle: null });
    await expect(runAsDirectoryReader(() => searchPeople.execute({ query: "Ada" }))).resolves.toMatchObject({
        people: [{ roleTitle: null }],
    });
    expect(mocks.getOne).toHaveBeenCalledWith(person.id);
    expect(mocks.getAllWithCount).toHaveBeenCalled();
    expect(mocks.getRoles).not.toHaveBeenCalled();
});
