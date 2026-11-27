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
        findOne: vi.fn(),
        hasMany: vi.fn(),
        hasOne: vi.fn(),
        update: vi.fn(),
    },
    PermissionEntity: {
        belongsTo: vi.fn(),
    },
}));

// Keep the real `sanitizeWhere` so the renumber assertions cover the tenant/deleted scoping; only
// the database-touching helpers are replaced.
vi.mock("../utils", async importOriginal => ({
    ...(await importOriginal<typeof import("../utils")>()),
    afterTransactionCommit: vi.fn(),
    createOne: vi.fn(),
    deleteOne: vi.fn(),
    findAll: findAllMock,
    findOne: findOneMock,
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

import { Op } from "sequelize";

import { DocumentEntity } from "@stacks/db";
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
        findAllMock.mockResolvedValue([]);
        vi.mocked(DocumentEntity.update).mockResolvedValue([0]);
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

    it("renumbers the destination parent densely instead of trusting the stored order values", async () => {
        // Root siblings whose stored orders have holes (archived and deleted children keep theirs).
        findAllMock.mockResolvedValue([
            { id: "a", parent: rootId, order: 0 },
            { id: "b", parent: rootId, order: 4 },
            { id: documentId, parent: rootId, order: 9 },
        ]);

        await DocumentsLoader.update(documentId, { parent: rootId, order: 1 });

        // Position 1 means "between a and b", so the sequence becomes a=0, moved=1, b=2. Only b
        // actually changes, so the dense rewrite touches a single row in one bulk update; a keeps
        // order 0 and the moved document is written by the main update below.
        expect(DocumentEntity.update).toHaveBeenCalledTimes(1);
        const [data, options] = vi.mocked(DocumentEntity.update).mock.calls[0];
        // The CASE expression is built with sequelize's `literal`, which the loader imports from the
        // real package, so assert on the raw SQL fragment it carries.
        expect(data).toEqual({
            order: expect.objectContaining({ val: 'CASE "id"::text WHEN \'b\' THEN 2 ELSE "order" END' }),
        });
        // The real `sanitizeWhere` runs here, so this also pins the tenant/deleted scoping the bulk
        // write relies on.
        expect(options).toEqual(
            expect.objectContaining({
                where: { id: { [Op.in]: ["b"] }, tenant: "tenant-1", deleted: null },
                returning: false,
            })
        );
        expect((updateOneMock.mock.calls[0][0] as any).data).toEqual(
            expect.objectContaining({ parent: rootId, order: 1 })
        );
    });

    it("rewrites every changed sibling in one CASE update", async () => {
        findAllMock.mockResolvedValue([
            { id: "a", parent: rootId, order: 0 },
            { id: "b", parent: rootId, order: 4 },
            { id: "c", parent: rootId, order: 8 },
            { id: documentId, parent: rootId, order: 9 },
        ]);

        await DocumentsLoader.update(documentId, { parent: rootId, order: 1 });

        // Sequence becomes a=0, moved=1, b=2, c=3: a and the moved document are unchanged, so b and
        // c must both be rewritten by the single statement and no other id may be in its scope.
        expect(DocumentEntity.update).toHaveBeenCalledTimes(1);
        const [data, options] = vi.mocked(DocumentEntity.update).mock.calls[0];
        expect(data).toEqual({
            order: expect.objectContaining({
                val: "CASE \"id\"::text WHEN 'b' THEN 2 WHEN 'c' THEN 3 ELSE \"order\" END",
            }),
        });
        expect(options).toEqual(
            expect.objectContaining({
                where: { id: { [Op.in]: ["b", "c"] }, tenant: "tenant-1", deleted: null },
            })
        );
    });

    it("skips the bulk rewrite when the sibling sequence is already dense", async () => {
        findAllMock.mockResolvedValue([
            { id: "a", parent: rootId, order: 0 },
            { id: documentId, parent: rootId, order: 1 },
            { id: "b", parent: rootId, order: 2 },
        ]);

        await DocumentsLoader.update(documentId, { parent: rootId, order: 1 });

        expect(DocumentEntity.update).not.toHaveBeenCalled();
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
