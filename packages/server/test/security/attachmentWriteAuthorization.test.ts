// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "crypto";
import {
    AttachmentEntity,
    CompanyEntity,
    DocumentEntity,
    FileEntity,
    NotepadEntity,
    PermissionEntity,
    ProjectEntity,
    RoleEntity,
    StackEntity,
    TaskEntity,
    UserEntity,
} from "@stacks/db";
import { FILES_TYPE, RECORDTYPE, ROLE_SECTIONS } from "@stacks/types";
import { existsSync, readdirSync, unlinkSync } from "fs";
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
        const path = `uploads/${hash}`;
        if (existsSync(path)) unlinkSync(path);
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

describe("attachment parent write authorization", () => {
    it("allows visible readers to download but denies their upload and single/bulk deletes", async () => {
        process.env.DELETE_FILES = "false";
        const tenant = id();
        const ownerId = id();
        const viewerId = id();
        const foreignTenant = id();
        const documentId = id();
        const bytes = Buffer.from(`attachment-owner-fixture-${id()}`);
        const hash = createHash("sha256").update(bytes).digest("hex");
        fixtureHashes.add(hash);

        await DocumentEntity.create({
            id: documentId,
            title: "attachment authorization fixture",
            type: RECORDTYPE.FILE,
            order: 0,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: documentId });
        await PermissionEntity.create({
            id: documentId,
            owner: ownerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: documentId });

        const runAs = <T>(userId: string, userTenant: string, fn: () => T, admin = false) =>
            requestContext.run(
                {
                    user: { id: userId, tenant: userTenant, admin } as any,
                    role: { id: id(), title: "Fixture", access: {} } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                fn
            );

        const temporaryFilesBeforeStreamedSuccess = readdirSync("uploads").filter(name =>
            name.startsWith(".upload-")
        );
        let successfulUploadId: string | undefined;
        const successfulUploadStream = new ReadableStream<Uint8Array>(
            {
                pull(controller) {
                    const tempFile = readdirSync("uploads").find(
                        name =>
                            name.startsWith(".upload-") && !temporaryFilesBeforeStreamedSuccess.includes(name)
                    );
                    successfulUploadId ??= tempFile?.slice(".upload-".length, -".tmp".length);
                    controller.enqueue(new Uint8Array(bytes));
                    controller.close();
                },
            },
            { highWaterMark: 0 }
        );
        const attachment = await runAs(ownerId, tenant, () =>
            FilesLoader.uploadFileStream(
                successfulUploadStream,
                "private.txt",
                "text/plain",
                documentId,
                { id: ownerId, tenant } as any,
                FILES_TYPE.FILE
            )
        );
        expect(successfulUploadId).toBeDefined();
        expect(FilesLoader.getStreamUploadProgress(successfulUploadId!, ownerId, tenant)).toBeNull();
        expect(readdirSync("uploads").filter(name => name.startsWith(".upload-"))).toEqual(
            temporaryFilesBeforeStreamedSuccess
        );

        const downloaded = await runAs(viewerId, tenant, () => FilesLoader.download(attachment.id));
        expect(downloaded?.buffer).toEqual(bytes);

        const failedBytes = Buffer.from(`persistence-failure-${id()}`);
        const failedHash = createHash("sha256").update(failedBytes).digest("hex");
        fixtureHashes.add(failedHash);
        const temporaryFilesBefore = readdirSync("uploads").filter(name => name.startsWith(".upload-"));
        let failedUploadId: string | undefined;
        const failedStream = new ReadableStream<Uint8Array>(
            {
                pull(controller) {
                    const tempFile = readdirSync("uploads").find(
                        name => name.startsWith(".upload-") && !temporaryFilesBefore.includes(name)
                    );
                    failedUploadId ??= tempFile?.slice(".upload-".length, -".tmp".length);
                    controller.enqueue(failedBytes);
                    controller.close();
                },
            },
            { highWaterMark: 0 }
        );
        const createAttachment = vi.spyOn(AttachmentEntity, "create").mockImplementationOnce(async () => {
            expect(existsSync(`uploads/${failedHash}`)).toBe(true);
            expect(failedUploadId).toBeDefined();
            expect(FilesLoader.getStreamUploadProgress(failedUploadId!, ownerId, tenant)).toMatchObject({
                progress: failedBytes.length,
                total: failedBytes.length,
            });
            throw new Error("injected attachment persistence failure");
        });
        try {
            await expect(
                runAs(ownerId, tenant, () =>
                    FilesLoader.uploadFileStream(
                        failedStream,
                        "failed-persistence.txt",
                        "text/plain",
                        documentId,
                        { id: ownerId, tenant } as any,
                        FILES_TYPE.FILE
                    )
                )
            ).rejects.toThrow("injected attachment persistence failure");
        } finally {
            createAttachment.mockRestore();
        }
        expect(readdirSync("uploads").filter(name => name.startsWith(".upload-"))).toEqual(
            temporaryFilesBefore
        );
        expect(FilesLoader.getStreamUploadProgress(failedUploadId!, ownerId, tenant)).toBeNull();
        expect(existsSync(`uploads/${failedHash}`)).toBe(false);
        expect(await FileEntity.findOne({ where: { hash: failedHash } })).toBeNull();
        expect(await AttachmentEntity.count({ where: { recordId: documentId, tenant, deleted: null } })).toBe(
            1
        );

        const oversizedBytes = 25 * 1024 * 1024 + 1;
        const filesBeforeOversizedUpload = readdirSync("uploads");
        const fileCountBeforeOversizedUpload = await FileEntity.count({ where: { tenant } });
        const attachmentCountBeforeOversizedUpload = await AttachmentEntity.count({
            where: { recordId: documentId, tenant, deleted: null },
        });
        let emittedOversizedBytes = 0;
        let oversizedUploadId: string | undefined;
        let oversizedStreamCancelled = false;
        const oversizedStream = new ReadableStream<Uint8Array>(
            {
                pull(controller) {
                    if (!oversizedUploadId) {
                        const tempFile = readdirSync("uploads").find(
                            name => name.startsWith(".upload-") && !filesBeforeOversizedUpload.includes(name)
                        );
                        oversizedUploadId = tempFile?.slice(".upload-".length, -".tmp".length);
                    }
                    const size = Math.min(64 * 1024, oversizedBytes - emittedOversizedBytes);
                    if (size === 0) return new Promise(() => undefined);
                    emittedOversizedBytes += size;
                    controller.enqueue(new Uint8Array(size));
                },
                cancel() {
                    oversizedStreamCancelled = true;
                },
            },
            { highWaterMark: 0 }
        );
        await expect(
            runAs(ownerId, tenant, () =>
                FilesLoader.uploadFileStream(
                    oversizedStream,
                    "oversized.txt",
                    "text/plain",
                    documentId,
                    { id: ownerId, tenant } as any,
                    FILES_TYPE.FILE
                )
            )
        ).rejects.toThrow("Upload exceeds the maximum size");
        expect(oversizedStreamCancelled).toBe(true);
        expect(oversizedUploadId).toBeDefined();
        expect(FilesLoader.getStreamUploadProgress(oversizedUploadId!, ownerId, tenant)).toBeNull();
        expect(readdirSync("uploads")).toEqual(filesBeforeOversizedUpload);
        expect(await FileEntity.count({ where: { tenant } })).toBe(fileCountBeforeOversizedUpload);
        expect(await AttachmentEntity.count({ where: { recordId: documentId, tenant, deleted: null } })).toBe(
            attachmentCountBeforeOversizedUpload
        );

        const deniedBytes = Buffer.from(`denied-upload-${id()}`);
        await expect(
            runAs(viewerId, tenant, () =>
                FilesLoader.uploadFile(deniedBytes, "denied.txt", "text/plain", documentId, FILES_TYPE.FILE, {
                    id: viewerId,
                    tenant,
                } as any)
            )
        ).rejects.toMatchObject({ statusCode: 403 });
        let streamPulls = 0;
        const deniedStream = new ReadableStream<Uint8Array>(
            {
                pull(controller) {
                    streamPulls += 1;
                    controller.enqueue(deniedBytes);
                    controller.close();
                },
            },
            { highWaterMark: 0 }
        );
        await expect(
            runAs(viewerId, tenant, () =>
                FilesLoader.uploadFileStream(
                    deniedStream,
                    "denied-stream.txt",
                    "text/plain",
                    documentId,
                    { id: viewerId, tenant } as any,
                    FILES_TYPE.FILE
                )
            )
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(streamPulls).toBe(0);
        await expect(
            runAs(viewerId, tenant, () => FilesLoader.deleteByAttachment(attachment.id))
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            runAs(viewerId, tenant, () => FilesLoader.deleteByRecord(documentId, FILES_TYPE.FILE))
        ).rejects.toMatchObject({ statusCode: 403 });

        const foreignAdminId = id();
        await expect(
            runAs(
                foreignAdminId,
                foreignTenant,
                () =>
                    FilesLoader.uploadFile(bytes, "foreign.txt", "text/plain", documentId, FILES_TYPE.FILE, {
                        id: foreignAdminId,
                        tenant: foreignTenant,
                        admin: true,
                    } as any),
                true
            )
        ).rejects.toMatchObject({ statusCode: 404 });
        await expect(
            runAs(foreignAdminId, foreignTenant, () => FilesLoader.deleteByAttachment(attachment.id), true)
        ).rejects.toMatchObject({ statusCode: 404 });
        await expect(
            runAs(
                foreignAdminId,
                foreignTenant,
                () => FilesLoader.deleteByRecord(documentId, FILES_TYPE.FILE),
                true
            )
        ).rejects.toMatchObject({ statusCode: 404 });

        expect(await AttachmentEntity.count({ where: { recordId: documentId, tenant, deleted: null } })).toBe(
            1
        );
        expect(
            await runAs(ownerId, tenant, () => FilesLoader.deleteByRecord(documentId, FILES_TYPE.FILE))
        ).toHaveLength(1);
    });

    it("uses company write RBAC for logo mutations while preserving permitted reads", async () => {
        process.env.DELETE_FILES = "false";
        const tenant = id();
        const writerId = id();
        const viewerId = id();
        const companyId = id();
        const bytes = Buffer.from(`company-logo-fixture-${id()}`);
        const hash = createHash("sha256").update(bytes).digest("hex");
        fixtureHashes.add(hash);

        await CompanyEntity.create({
            id: companyId,
            title: "company logo authorization fixture",
            tenant,
            createdBy: writerId,
            updatedBy: writerId,
        });
        fixtureRows.push({ entity: CompanyEntity, id: companyId });

        const runAs = <T>(userId: string, access: Record<string, unknown>, fn: () => T, admin = false) =>
            requestContext.run(
                {
                    user: { id: userId, tenant, admin } as any,
                    role: { id: id(), title: "Fixture", access } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                fn
            );

        const attachment = await runAs(writerId, { companies: { write: true } }, () =>
            FilesLoader.uploadFile(
                bytes,
                "logo.bin",
                "application/octet-stream",
                companyId,
                FILES_TYPE.COMPANY_LOGO,
                { id: writerId, tenant } as any
            )
        );

        const downloaded = await runAs(viewerId, { companies: { read: true } }, () =>
            FilesLoader.download(attachment.id)
        );
        expect(downloaded?.buffer).toEqual(bytes);

        await expect(
            runAs(viewerId, { companies: { read: true, write: false } }, () =>
                FilesLoader.uploadFile(
                    Buffer.from(`denied-logo-${id()}`),
                    "denied.bin",
                    "application/octet-stream",
                    companyId,
                    FILES_TYPE.COMPANY_LOGO,
                    { id: viewerId, tenant } as any
                )
            )
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            runAs(viewerId, { companies: { read: true, write: false } }, () =>
                FilesLoader.deleteByRecord(companyId, FILES_TYPE.COMPANY_LOGO)
            )
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(await AttachmentEntity.count({ where: { recordId: companyId, tenant, deleted: null } })).toBe(
            1
        );
        await runAs(writerId, { companies: { write: true } }, () =>
            FilesLoader.deleteByRecord(companyId, FILES_TYPE.COMPANY_LOGO)
        );
    });

    it("uses task ACL for task files and comments RBAC for task comment attachments", async () => {
        process.env.DELETE_FILES = "false";
        const tenant = id();
        const ownerId = id();
        const viewerId = id();
        const projectId = id();
        const taskId = id();

        await DocumentEntity.create({
            id: projectId,
            title: "task attachment project fixture",
            type: RECORDTYPE.PROJECT,
            order: 0,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: DocumentEntity, id: projectId });
        await ProjectEntity.create({
            id: projectId,
            projectOwner: ownerId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await PermissionEntity.create({
            id: projectId,
            owner: ownerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: projectId });

        const stackId = id();
        await StackEntity.create({
            id: stackId,
            title: "task attachment stack fixture",
            project: projectId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: StackEntity, id: stackId });
        await TaskEntity.create({
            id: taskId,
            title: "task attachment fixture",
            project: projectId,
            stack: stackId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: TaskEntity, id: taskId });
        await PermissionEntity.create({
            id: taskId,
            owner: ownerId,
            isPublic: true,
            visibleUsers: [],
            visibleRoles: [],
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: PermissionEntity, id: taskId });

        const runAs = <T>(userId: string, access: Record<string, unknown>, fn: () => T) =>
            requestContext.run(
                {
                    user: { id: userId, tenant } as any,
                    role: { id: id(), title: "Fixture", access } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                fn
            );
        const uploadAs = (userId: string, type: FILES_TYPE, access: Record<string, unknown> = {}) => {
            const bytes = Buffer.from(`task-${type}-${id()}`);
            const hash = createHash("sha256").update(bytes).digest("hex");
            fixtureHashes.add(hash);
            return runAs(userId, access, () =>
                FilesLoader.uploadFile(bytes, `${type}.txt`, "text/plain", taskId, type, {
                    id: userId,
                    tenant,
                } as any)
            );
        };

        const taskFile = await uploadAs(ownerId, FILES_TYPE.TASK_ATTACHMENT);
        const taskCover = await uploadAs(ownerId, FILES_TYPE.TASK_COVER);
        const deniedViewer = await runAs(viewerId, {}, () => FilesLoader.download(taskFile.id));
        expect(deniedViewer?.buffer).toBeTruthy();
        await expect(uploadAs(viewerId, FILES_TYPE.TASK_ATTACHMENT)).rejects.toMatchObject({
            statusCode: 403,
        });
        await expect(
            runAs(viewerId, {}, () => FilesLoader.deleteByAttachment(taskCover.id))
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(uploadAs(ownerId, FILES_TYPE.TASK_COMMENT)).rejects.toMatchObject({ statusCode: 403 });

        const commentAccess = { [ROLE_SECTIONS.COMMENTS]: { write: true } };
        const comment = await uploadAs(viewerId, FILES_TYPE.TASK_COMMENT, commentAccess);
        expect(
            await runAs(viewerId, commentAccess, () =>
                FilesLoader.deleteByRecord(taskId, FILES_TYPE.TASK_COMMENT)
            )
        ).toHaveLength(1);
        await runAs(ownerId, {}, () => FilesLoader.deleteByRecord(taskId, FILES_TYPE.TASK_ATTACHMENT));
        await runAs(ownerId, {}, () => FilesLoader.deleteByRecord(taskId, FILES_TYPE.TASK_COVER));
        expect(comment.id).toBeTruthy();
    });

    it("uses ACL ownership for notepad files and project settings RBAC for project descriptions", async () => {
        process.env.DELETE_FILES = "false";
        const tenant = id();
        const ownerId = id();
        const viewerId = id();
        const settingsWriterId = id();
        const projectId = id();
        const notepadId = id();

        const runAs = <T>(userId: string, access: Record<string, unknown>, fn: () => T) =>
            requestContext.run(
                {
                    user: { id: userId, tenant } as any,
                    role: { id: id(), title: "Fixture", access } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                fn
            );
        const addDocument = async (recordId: string, type: RECORDTYPE, userId: string) => {
            await DocumentEntity.create({
                id: recordId,
                title: "attachment authorization fixture",
                type,
                order: 0,
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: DocumentEntity, id: recordId });
            await PermissionEntity.create({
                id: recordId,
                owner: userId,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
                tenant,
                createdBy: userId,
                updatedBy: userId,
            });
            fixtureRows.push({ entity: PermissionEntity, id: recordId });
        };
        const uploadAs = (
            recordId: string,
            type: FILES_TYPE,
            userId: string,
            access: Record<string, unknown>
        ) => {
            const bytes = Buffer.from(`parent-${type}-${id()}`);
            fixtureHashes.add(createHash("sha256").update(bytes).digest("hex"));
            return runAs(userId, access, () =>
                FilesLoader.uploadFile(bytes, `${type}.txt`, "text/plain", recordId, type, {
                    id: userId,
                    tenant,
                } as any)
            );
        };

        await addDocument(projectId, RECORDTYPE.PROJECT, ownerId);
        await ProjectEntity.create({
            id: projectId,
            projectOwner: ownerId,
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: ProjectEntity, id: projectId });
        await addDocument(notepadId, RECORDTYPE.NOTEPAD, ownerId);
        await NotepadEntity.create({
            id: notepadId,
            content: "notepad attachment fixture",
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: NotepadEntity, id: notepadId });

        const projectDescription = await uploadAs(projectId, FILES_TYPE.PROJECT_DESCRIPTION, ownerId, {});
        const projectSettingsAccess = { [ROLE_SECTIONS.PROJECT_SETTINGS]: { write: true } };
        await uploadAs(projectId, FILES_TYPE.PROJECT_DESCRIPTION, settingsWriterId, projectSettingsAccess);
        expect(
            (await runAs(viewerId, {}, () => FilesLoader.download(projectDescription.id)))?.buffer
        ).toBeTruthy();
        await expect(uploadAs(projectId, FILES_TYPE.PROJECT_DESCRIPTION, viewerId, {})).rejects.toMatchObject(
            { statusCode: 403 }
        );
        await runAs(settingsWriterId, projectSettingsAccess, () =>
            FilesLoader.deleteByRecord(projectId, FILES_TYPE.PROJECT_DESCRIPTION)
        );

        const notepadFile = await uploadAs(notepadId, FILES_TYPE.NOTEPAD_FILE, ownerId, {});
        const notepadCover = await uploadAs(notepadId, FILES_TYPE.NOTEPAD_COVER, ownerId, {});
        expect((await runAs(viewerId, {}, () => FilesLoader.download(notepadFile.id)))?.buffer).toBeTruthy();
        await expect(uploadAs(notepadId, FILES_TYPE.NOTEPAD_FILE, viewerId, {})).rejects.toMatchObject({
            statusCode: 403,
        });
        await expect(
            runAs(viewerId, {}, () => FilesLoader.deleteByAttachment(notepadCover.id))
        ).rejects.toMatchObject({ statusCode: 403 });
        await runAs(ownerId, {}, () => FilesLoader.deleteByRecord(notepadId, FILES_TYPE.NOTEPAD_FILE));
        await runAs(ownerId, {}, () => FilesLoader.deleteByRecord(notepadId, FILES_TYPE.NOTEPAD_COVER));
    });

    it("allows avatar writes only to the account owner or an admin", async () => {
        process.env.DELETE_FILES = "false";
        const tenant = id();
        const ownerId = id();
        const viewerId = id();
        const roleId = id();

        await RoleEntity.create({
            id: roleId,
            title: "avatar authorization fixture",
            access: {},
            tenant,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: RoleEntity, id: roleId });
        await UserEntity.create({
            id: ownerId,
            email: `${ownerId}@example.test`,
            password: "synthetic-password-hash",
            firstName: "Avatar",
            lastName: "Owner",
            role: roleId,
            tenant,
            real: true,
            system: false,
            createdBy: ownerId,
            updatedBy: ownerId,
        });
        fixtureRows.push({ entity: UserEntity, id: ownerId });

        const runAs = <T>(userId: string, fn: () => T, admin = false) =>
            requestContext.run(
                {
                    user: { id: userId, tenant, admin } as any,
                    role: { id: roleId, title: "Fixture", access: {} } as any,
                    instanceId: id(),
                    requestId: id(),
                    timestamp: Date.now(),
                },
                fn
            );
        const bytes = Buffer.from(`avatar-fixture-${id()}`);
        const hash = createHash("sha256").update(bytes).digest("hex");
        fixtureHashes.add(hash);

        const attachment = await runAs(ownerId, () =>
            FilesLoader.uploadFile(
                bytes,
                "avatar.bin",
                "application/octet-stream",
                ownerId,
                FILES_TYPE.AVATAR,
                { id: ownerId, tenant } as any
            )
        );
        expect((await runAs(viewerId, () => FilesLoader.download(attachment.id)))?.buffer).toEqual(bytes);
        await expect(
            runAs(viewerId, () =>
                FilesLoader.uploadFile(
                    Buffer.from(`denied-avatar-${id()}`),
                    "avatar.bin",
                    "application/octet-stream",
                    ownerId,
                    FILES_TYPE.AVATAR,
                    { id: viewerId, tenant } as any
                )
            )
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            runAs(viewerId, () => FilesLoader.deleteByAttachment(attachment.id))
        ).rejects.toMatchObject({ statusCode: 403 });
        await runAs(ownerId, () => FilesLoader.deleteByAttachment(attachment.id));
    });
});
