// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "crypto";
import { AttachmentEntity, DocumentEntity, FileEntity, PermissionEntity, sequelize } from "@stacks/db";
import { FILES_TYPE, RECORDTYPE } from "@stacks/types";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { lockContentHash, countGlobalLiveAttachments } from "../../src/utils/fileStorage";
import { FilesLoader } from "../../src/loaders/files";
import { requestContext } from "../../src/services/requestContext";

const id = () => randomUUID();
const originalDeleteFiles = process.env.DELETE_FILES;
const fixtureHashes = new Set<string>();
const fixtureRows: Array<{ entity: any; id: string }> = [];

afterEach(async () => {
    if (originalDeleteFiles === undefined) delete process.env.DELETE_FILES;
    else process.env.DELETE_FILES = originalDeleteFiles;
    for (const hash of fixtureHashes) {
        for (const filePath of [
            `uploads/${hash}`,
            `previews/${hash}_small.jpg`,
            `previews/${hash}_large.jpg`,
            `uploads/previews/${hash}_small.jpg`,
            `uploads/previews/${hash}_large.jpg`,
        ]) {
            if (existsSync(filePath)) unlinkSync(filePath);
        }
        const file = await FileEntity.findOne({ where: { hash } });
        if (file) {
            const fileId = String(file.get("id"));
            await AttachmentEntity.destroy({ where: { fileId }, force: true });
            await FileEntity.destroy({ where: { id: fileId }, force: true });
        }
    }
    fixtureHashes.clear();
    for (const { entity, id: rowId } of fixtureRows.reverse()) {
        await entity.destroy({ where: { id: rowId }, force: true });
    }
    fixtureRows.length = 0;
});

describe("physical file lifecycle coordination", () => {
    it("serializes transactions for the same content hash without blocking different hashes", async () => {
        const sameHash = "a".repeat(64);
        const first = await sequelize.transaction();
        const second = await sequelize.transaction();
        try {
            await lockContentHash(first, sameHash);
            let secondAcquired = false;
            const waiting = lockContentHash(second, sameHash).then(() => {
                secondAcquired = true;
            });
            await new Promise(resolve => setTimeout(resolve, 80));
            expect(secondAcquired).toBe(false);
            await first.commit();
            await waiting;
            expect(secondAcquired).toBe(true);
        } finally {
            if (!first.finished) await first.rollback();
            if (!second.finished) await second.rollback();
        }

        const differentHashFirst = await sequelize.transaction();
        const differentHashSecond = await sequelize.transaction();
        try {
            await lockContentHash(differentHashFirst, "b".repeat(64));
            await lockContentHash(differentHashSecond, "c".repeat(64));
        } finally {
            await differentHashFirst.rollback();
            await differentHashSecond.rollback();
        }
    });

    it("counts live attachment references across tenant ids", async () => {
        const transaction = await sequelize.transaction();
        const tenantA = id();
        const tenantB = id();
        const userA = id();
        const file = await FileEntity.create(
            {
                hash: id().replace(/-/g, "").padEnd(64, "a").slice(0, 64),
                mimeType: "application/octet-stream",
                size: 4,
                tenant: tenantA,
                createdBy: userA,
                updatedBy: userA,
            },
            { transaction }
        );

        try {
            for (const tenant of [tenantA, tenantB]) {
                const user = id();
                await AttachmentEntity.create(
                    {
                        fileId: file.get("id"),
                        recordId: id(),
                        originalName: "object.bin",
                        type: FILES_TYPE.FILE,
                        hasPreview: false,
                        tenant,
                        createdBy: user,
                        updatedBy: user,
                    },
                    { transaction }
                );
            }

            await expect(countGlobalLiveAttachments(String(file.get("id")), transaction)).resolves.toBe(2);
        } finally {
            await transaction.rollback();
        }
    });

    it("keeps the shared physical object while another tenant still references it", async () => {
        const buffer = Buffer.from(`storage-fixture-${id()}`);
        const hash = createHash("sha256").update(buffer).digest("hex");
        fixtureHashes.add(hash);
        process.env.DELETE_FILES = "true";
        const tenantA = id();
        const tenantB = id();
        const userA = id();
        const createParent = async (tenant: string, userId: string) => {
            const documentId = id();
            await DocumentEntity.create({
                id: documentId,
                title: "storage lifecycle fixture",
                type: RECORDTYPE.FILE,
                order: 0,
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: DocumentEntity, id: documentId });
            await PermissionEntity.create({
                id: documentId,
                owner: userId,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: PermissionEntity, id: documentId });
            return documentId;
        };
        const parentA = await createParent(tenantA, userA);
        const userB = id();
        const parentB = await createParent(tenantB, userB);
        const uploadAs = (tenant: string, userId: string, parentId: string) =>
            requestContext.run(
                {
                    user: { id: userId, tenant, admin: true } as any,
                    role: { id: id(), title: "Admin", access: {} } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                () =>
                    FilesLoader.uploadFile(
                        buffer,
                        "object.bin",
                        "application/octet-stream",
                        parentId,
                        FILES_TYPE.FILE,
                        { id: userId, tenant, admin: true } as any
                    )
            );
        const attachmentA = await uploadAs(tenantA, userA, parentA);
        const attachmentB = await uploadAs(tenantB, userB, parentB);
        const fileId = attachmentA.fileId;
        expect(attachmentB.fileId).toBe(fileId);
        const previewBytes = Buffer.from("preview fixture");
        mkdirSync("previews", { recursive: true });
        writeFileSync(`previews/${hash}_large.jpg`, previewBytes);

        const deleteAs = (tenant: string, userId: string, attachmentId: string) =>
            requestContext.run(
                {
                    user: { id: userId, tenant, admin: true } as any,
                    role: { id: id(), title: "Admin", access: {} } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                () => FilesLoader.deleteByAttachment(attachmentId)
            );

        await deleteAs(tenantA, userA, attachmentA.id);

        expect(existsSync(`uploads/${hash}`)).toBe(true);
        expect(existsSync(`previews/${hash}_large.jpg`)).toBe(true);
        expect(await AttachmentEntity.count({ where: { fileId, tenant: tenantB, deleted: null } })).toBe(1);
        expect((await FileEntity.findByPk(fileId))?.get("deleted")).toBeNull();
        const remainingDownload = await requestContext.run(
            {
                user: { id: userB, tenant: tenantB, admin: true } as any,
                role: { id: id(), title: "Admin", access: {} } as any,
                instanceId: id(),
                requestId: id(),
                timestamp: Date.now(),
            },
            () => FilesLoader.download(attachmentB.id)
        );
        expect(remainingDownload?.buffer).toEqual(buffer);
        const remainingPreview = await requestContext.run(
            {
                user: { id: userB, tenant: tenantB, admin: true } as any,
                role: { id: id(), title: "Admin", access: {} } as any,
                instanceId: id(),
                requestId: id(),
                timestamp: Date.now(),
            },
            () => FilesLoader.getPreviewByAttachmentId(attachmentB.id, "large")
        );
        expect(remainingPreview?.buffer).toEqual(previewBytes);

        await deleteAs(tenantB, userB, attachmentB.id);
        expect(existsSync(`uploads/${hash}`)).toBe(false);

        // Repeat with the opposite deletion order to verify the last reference owns cleanup.
        const attachmentBFirst = await uploadAs(tenantB, userB, parentB);
        const attachmentASecond = await uploadAs(tenantA, userA, parentA);
        expect(attachmentASecond.fileId).toBe(attachmentBFirst.fileId);
        await deleteAs(tenantB, userB, attachmentBFirst.id);
        expect(existsSync(`uploads/${hash}`)).toBe(true);
        await deleteAs(tenantA, userA, attachmentASecond.id);
        expect(existsSync(`uploads/${hash}`)).toBe(false);
    });

    it("does not let a concurrent delete remove an object being reattached", async () => {
        const buffer = Buffer.from(`race-fixture-${id()}`);
        const hash = createHash("sha256").update(buffer).digest("hex");
        fixtureHashes.add(hash);
        process.env.DELETE_FILES = "true";
        const tenant = id();
        const userId = id();
        const parentId = id();
        await DocumentEntity.create({
            id: parentId,
            title: "storage race fixture",
            type: RECORDTYPE.FILE,
            order: 0,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: parentId });
        await PermissionEntity.create({
            id: parentId,
            owner: userId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: parentId });
        const context = {
            user: { id: userId, tenant, admin: true } as any,
            role: { id: id(), title: "Admin", access: {} } as any,
            instanceId: id(),
            requestId: id(),
            timestamp: Date.now(),
        };
        const upload = (transaction?: any) =>
            requestContext.run(context, () =>
                FilesLoader.uploadFile(
                    buffer,
                    "race.bin",
                    "application/octet-stream",
                    parentId,
                    FILES_TYPE.FILE,
                    context.user,
                    transaction
                )
            );
        const original = await upload();
        const uploadTransaction = await sequelize.transaction();
        const deleteTransaction = await sequelize.transaction();
        let deletePromise: Promise<unknown> | undefined;
        try {
            await upload(uploadTransaction);
            let deleteFinished = false;
            deletePromise = requestContext
                .run(context, () => FilesLoader.deleteByAttachment(original.id, deleteTransaction))
                .then(result => {
                    deleteFinished = true;
                    return result;
                });
            await new Promise(resolve => setTimeout(resolve, 80));
            expect(deleteFinished).toBe(false);

            await uploadTransaction.commit();
            await deletePromise;
            await deleteTransaction.commit();

            expect(existsSync(`uploads/${hash}`)).toBe(true);
            expect(await AttachmentEntity.count({ where: { fileId: original.fileId, deleted: null } })).toBe(
                1
            );
        } finally {
            if (!uploadTransaction.finished) await uploadTransaction.rollback();
            await deletePromise?.catch(() => undefined);
            if (!deleteTransaction.finished) await deleteTransaction.rollback();
        }
    });

    it("defers physical deletion until commit and removes canonical preview files", async () => {
        const buffer = Buffer.from(`rollback-fixture-${id()}`);
        const hash = createHash("sha256").update(buffer).digest("hex");
        fixtureHashes.add(hash);
        process.env.DELETE_FILES = "true";
        const tenant = id();
        const userId = id();
        const parentId = id();
        await DocumentEntity.create({
            id: parentId,
            title: "storage rollback fixture",
            type: RECORDTYPE.FILE,
            order: 0,
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: parentId });
        await PermissionEntity.create({
            id: parentId,
            owner: userId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: userId,
            updatedBy: userId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: parentId });
        const context = {
            user: { id: userId, tenant, admin: true } as any,
            role: { id: id(), title: "Admin", access: {} } as any,
            instanceId: id(),
            requestId: id(),
            timestamp: Date.now(),
        };
        const attachment = await requestContext.run(context, () =>
            FilesLoader.uploadFile(
                buffer,
                "rollback.bin",
                "application/octet-stream",
                parentId,
                FILES_TYPE.FILE,
                context.user
            )
        );
        mkdirSync("previews", { recursive: true });
        writeFileSync(`previews/${hash}_small.jpg`, "small preview");
        writeFileSync(`previews/${hash}_large.jpg`, "large preview");
        const transaction = await sequelize.transaction();
        try {
            await requestContext.run(context, () =>
                FilesLoader.deleteByAttachment(attachment.id, transaction)
            );
            expect(existsSync(`uploads/${hash}`)).toBe(true);
            await transaction.rollback();
            expect(existsSync(`uploads/${hash}`)).toBe(true);
            expect(await AttachmentEntity.count({ where: { id: attachment.id, deleted: null } })).toBe(1);
        } finally {
            if (!transaction.finished) await transaction.rollback();
        }

        await requestContext.run(context, () => FilesLoader.deleteByAttachment(attachment.id));
        expect(existsSync(`uploads/${hash}`)).toBe(false);
        expect(existsSync(`previews/${hash}_small.jpg`)).toBe(false);
        expect(existsSync(`previews/${hash}_large.jpg`)).toBe(false);

        process.env.DELETE_FILES = "false";
        const retainedAttachment = await requestContext.run(context, () =>
            FilesLoader.uploadFile(
                buffer,
                "rollback.bin",
                "application/octet-stream",
                parentId,
                FILES_TYPE.FILE,
                context.user
            )
        );
        await requestContext.run(context, () => FilesLoader.deleteByAttachment(retainedAttachment.id));
        expect(existsSync(`uploads/${hash}`)).toBe(true);
    });
});
