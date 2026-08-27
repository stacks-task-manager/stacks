// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findAllMock, findOneMock, updateOneMock } = vi.hoisted(() => ({
    findAllMock: vi.fn(),
    findOneMock: vi.fn(),
    updateOneMock: vi.fn(),
}));

vi.mock("@stacks/db", () => ({
    AttachmentEntity: {},
    DocumentEntity: {
        associations: {},
        count: vi.fn().mockResolvedValue(1),
        findOne: vi.fn(),
        hasMany: vi.fn(),
        hasOne: vi.fn(),
        update: vi.fn().mockResolvedValue([1]),
    },
    PermissionEntity: {
        belongsTo: vi.fn(),
    },
    sequelize: {
        literal: vi.fn(value => value),
    },
}));

vi.mock("../utils", () => ({
    afterTransactionCommit: vi.fn(),
    createOne: vi.fn(),
    deleteOne: vi.fn(),
    findAll: findAllMock,
    findOne: findOneMock,
    sanitizeWhere: vi.fn(value => value),
    updateOne: updateOneMock,
    withTransaction: vi.fn((_transaction, callback) => callback({ id: "transaction" })),
}));

vi.mock("../context", () => ({
    getCurrentUser: vi.fn(() => ({ id: "user-1", tenant: "tenant-1" })),
}));

vi.mock("../files", () => ({ FilesLoader: {} }));
vi.mock("../notepads", () => ({ NotepadsLoader: {} }));
vi.mock("../permissions", () => ({ PermissionsLoader: {} }));
vi.mock("../projects", () => ({ ProjectsLoader: {} }));
vi.mock("../../events", () => ({ sendRealtimeUpdate: vi.fn() }));
vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));

import { DocumentsLoader } from "../documents";

const rootId = "00000000-0000-0000-0000-000000000000";
const documentId = "11111111-1111-4111-8111-111111111111";
const folderId = "22222222-2222-4222-8222-222222222222";

const document = (id: string) => ({
    id,
    parent: rootId,
    order: 0,
    type: "project",
    permissions: {
        owner: "another-user",
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
    },
});

describe("DocumentsLoader update ACL", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findOneMock.mockImplementation(({ id }) => Promise.resolve(document(id)));
        updateOneMock.mockResolvedValue(document(documentId));
    });

    it("allows ACL-visible documents to be moved into an ACL-visible folder", async () => {
        await DocumentsLoader.update(documentId, { parent: folderId, order: 0 });

        expect(updateOneMock).toHaveBeenCalledWith(
            expect.objectContaining({
                id: documentId,
                writePolicy: "visible",
            })
        );
    });

    it("keeps non-move document updates restricted to the ACL owner", async () => {
        await DocumentsLoader.update(documentId, { title: "Renamed" });

        expect(updateOneMock).toHaveBeenCalledWith(
            expect.objectContaining({
                id: documentId,
                writePolicy: "owner",
            })
        );
    });
});

describe("DocumentsLoader tree ACL", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns documents whose complete folder ancestry is visible", async () => {
        const folder = { ...document(folderId), type: "folder" };
        const subfolder = {
            ...document("33333333-3333-4333-8333-333333333333"),
            parent: folderId,
            type: "folder",
        };
        const project = {
            ...document(documentId),
            parent: subfolder.id,
        };
        findAllMock.mockResolvedValue([folder, subfolder, project]);

        const result = await DocumentsLoader.getAll();

        expect(result.map(item => item.id)).toEqual([folder.id, subfolder.id, project.id]);
    });

    it("excludes visible descendants when an ACL-inaccessible folder is absent", async () => {
        const inaccessibleFolderId = "44444444-4444-4444-8444-444444444444";
        const visibleSubfolder = {
            ...document("33333333-3333-4333-8333-333333333333"),
            parent: inaccessibleFolderId,
            type: "folder",
        };
        const visibleProject = {
            ...document(documentId),
            parent: visibleSubfolder.id,
        };

        // findAll is ACL-scoped, so the inaccessible ancestor is not returned.
        findAllMock.mockResolvedValue([visibleSubfolder, visibleProject]);

        const result = await DocumentsLoader.getAll();

        expect(result).toEqual([]);
    });
});
