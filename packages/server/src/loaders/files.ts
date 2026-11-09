// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AttachmentEntity, FileEntity, PermissionEntity, sequelize } from "@stacks/db";
import { Errors } from "../errors";
import { FILES_TYPE, ROLE_SECTIONS, type IAttachment } from "@stacks/types";
import crypto, { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import path, { join } from "path";
import { Transaction } from "sequelize";
import { ThumbnailService } from "../services/thumbnailService";
import type { User } from "../types/user";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { canWrite, getCurrentUser } from "./context";
import { afterTransactionCommit, withTransaction } from "./utils";
import { formatBytes } from "../utils/files";
import { translate } from "@stacks/translations";
import { TasksLoader } from "./tasks";
import { ProjectsLoader } from "./projects";
import { NotepadsLoader } from "./notepads";
import { DocumentsLoader } from "./documents";
import { PeopleLoader } from "./people";
import { CompaniesLoader } from "./companies";
import { writeBoundedStreamToFile } from "../utils/boundedStream";
import { visibleUploadProgress, type UploadProgressRecord } from "../utils/uploadProgress";
import { canWriteAttachmentParent } from "../utils/attachmentWritePolicy";
import {
    countGlobalLiveAttachments,
    lockContentHash,
    publishOwnedStorageFile,
    unlinkOwnedStorageFile,
    writeOwnedStorageFile,
} from "../utils/fileStorage";

// Constants for file handling
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Streaming upload progress tracking
const uploadProgress = new Map<string, UploadProgressRecord>();

// Set up associations
if (!AttachmentEntity.associations.File) {
    AttachmentEntity.belongsTo(FileEntity, { foreignKey: "fileId", as: "File" });
}
if (!FileEntity.associations.Attachments) {
    FileEntity.hasMany(AttachmentEntity, { foreignKey: "fileId", as: "Attachments" });
}

const UPLOAD_DIR = join(process.cwd(), "uploads");
const PREVIEW_DIR = join(process.cwd(), "previews");

async function assertAttachmentParentVisible(recordId: string, type: string, transaction?: Transaction) {
    if (!Object.values(FILES_TYPE).includes(type as FILES_TYPE)) {
        throw Errors.badRequest(translate("Invalid file type"));
    }

    if (
        [FILES_TYPE.TASK_ATTACHMENT, FILES_TYPE.TASK_COVER, FILES_TYPE.TASK_COMMENT].includes(
            type as FILES_TYPE
        )
    ) {
        await TasksLoader.getOne(recordId, transaction);
        return;
    }
    if (type === FILES_TYPE.PROJECT_DESCRIPTION) {
        await ProjectsLoader.getOne(recordId, transaction);
        return;
    }
    if ([FILES_TYPE.NOTEPAD_COVER, FILES_TYPE.NOTEPAD_FILE].includes(type as FILES_TYPE)) {
        await NotepadsLoader.getOne(recordId, transaction);
        return;
    }
    if (type === FILES_TYPE.FILE) {
        await DocumentsLoader.getOne(recordId, transaction);
        return;
    }
    if (type === FILES_TYPE.AVATAR) {
        await PeopleLoader.getOne(recordId);
        return;
    }
    if (type === FILES_TYPE.COMPANY_LOGO) {
        await CompaniesLoader.getOne(recordId);
    }
}

async function assertAttachmentParentWritable(recordId: string, type: string, transaction?: Transaction) {
    await assertAttachmentParentVisible(recordId, type, transaction);
    const user = getCurrentUser();
    let ownerId: string | null | undefined;
    let projectOwnerId: string | null | undefined;

    if (type === FILES_TYPE.PROJECT_DESCRIPTION) {
        const project = await ProjectsLoader.getOne(recordId, transaction);
        projectOwnerId = project.projectOwner;
    } else if (type === FILES_TYPE.AVATAR) {
        ownerId = recordId;
    } else if (type !== FILES_TYPE.TASK_COMMENT) {
        const permission = await PermissionEntity.findOne({
            where: { id: recordId, tenant: user.tenant, deleted: null },
            transaction,
        });
        ownerId = permission?.get("owner") as string | undefined;
    }

    if (
        !canWriteAttachmentParent({
            type,
            admin: Boolean(user.admin),
            userId: String(user.id),
            ownerId,
            projectOwnerId,
            canWriteComments: canWrite(ROLE_SECTIONS.COMMENTS),
            canWriteCompanies: canWrite(ROLE_SECTIONS.COMPANIES),
            canWriteProjectSettings: canWrite(ROLE_SECTIONS.PROJECT_SETTINGS),
        })
    ) {
        throw Errors.forbidden(translate("Record update not allowed"));
    }
}

// Ensure upload and preview directories exist
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!existsSync(PREVIEW_DIR)) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
}

/**
 * Calculate SHA-256 hash for file content
 * @param buffer - File buffer to hash
 * @returns SHA-256 hash string
 */
function calculateHash(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Get file download URL by attachment ID
 * @param attachmentId - The attachment ID
 * @returns File download URL
 */
function getFileDownloadUrl(attachmentId: string): string {
    return `/api/files/download/${attachmentId}`;
}

/**
 * Get preview URL for a file
 * @param attachmentId - The attachment ID
 * @param size - Preview size (small or large)
 * @returns Preview URL
 */
function getFilePreviewUrl(attachmentId: string, size: "small" | "large" = "large"): string {
    return `/api/files/preview/${attachmentId}?size=${size}`;
}

/**
 * Format attachment object with file data for consistent return format
 * @param attachment - Attachment entity instance
 * @param file - File entity instance
 * @returns Formatted attachment object
 */
function formatAttachmentObject(attachment: any, file: any): IAttachment {
    const originalName = attachment.get("originalName") as string;
    const extension = originalName ? path.extname(originalName).toLowerCase().replace(".", "") : "";
    const hasPreview = attachment.get("hasPreview") as boolean;

    return {
        id: attachment.get("id") as string,
        fileId: file.id,
        recordId: attachment.get("recordId") as string,

        downloadUrl: getFileDownloadUrl(attachment.get("id") as string),
        previewUrl: getFilePreviewUrl(attachment.get("id") as string),
        thumbnailUrl: hasPreview ? getFilePreviewUrl(attachment.get("id") as string) : null,
        hasPreview,

        originalName,
        type: attachment.get("type") as FILES_TYPE,
        extension,
        size: file.size,
        humanSize: formatBytes(file.size),
        mimeType: file.mimeType,
        created: attachment.get("created") as string,
        updated: attachment.get("updated") as string,
    };
}

/**
 * Soft delete attachment and optionally delete file if no other attachments reference it
 * @param attachment - Attachment entity to delete
 * @param user - User performing the deletion
 * @param transaction - Database transaction
 */
async function softDeleteAttachment(attachment: any, transaction: Transaction): Promise<void> {
    const user = getCurrentUser();
    const fileId = attachment.get("fileId") as string;
    const fileEntity = await FileEntity.findByPk(fileId, { transaction });

    if (fileEntity) {
        const fileHash = fileEntity.get("hash") as string;
        await lockContentHash(transaction, fileHash);
    }

    // Soft delete the attachment
    await attachment.update(
        {
            deleted: new Date(),
            deletedBy: user.id,
        },
        { transaction }
    );

    const remainingAttachments = await countGlobalLiveAttachments(fileId, transaction);

    // If no remaining attachments, delete the actual file
    if (remainingAttachments === 0) {
        if (fileEntity) {
            const fileHash = fileEntity.get("hash") as string;
            const shouldDeleteFiles = process.env.DELETE_FILES === "true";
            await fileEntity.update(
                {
                    deleted: new Date(),
                    deletedBy: user.id,
                },
                { transaction }
            );

            // A rollback must leave the physical object untouched. The cleanup takes the same
            // hash lock as upload, then checks every live reference after this transaction commits.
            if (shouldDeleteFiles) {
                afterTransactionCommit(transaction, async () => {
                    try {
                        await sequelize.transaction(async cleanupTransaction => {
                            await lockContentHash(cleanupTransaction, fileHash);
                            const fileRows = await FileEntity.findAll({
                                where: { hash: fileHash },
                                attributes: ["id", "deleted"],
                                transaction: cleanupTransaction,
                            });
                            if (fileRows.some(row => !row.get("deleted"))) return;
                            for (const row of fileRows) {
                                if (
                                    (await countGlobalLiveAttachments(
                                        String(row.get("id")),
                                        cleanupTransaction
                                    )) > 0
                                ) {
                                    return;
                                }
                            }

                            await unlinkOwnedStorageFile(UPLOAD_DIR, fileHash);
                            await unlinkOwnedStorageFile(PREVIEW_DIR, `${fileHash}_small.jpg`);
                            await unlinkOwnedStorageFile(PREVIEW_DIR, `${fileHash}_large.jpg`);
                        });
                    } catch {
                        // The database row is already committed as deleted. Leave any orphaned
                        // bytes in place; a later upload can safely reuse or replace them.
                        console.error("Deferred physical file cleanup failed");
                    }
                });
            }
        }
    }
}

/**
 * Create or update file upload
 * @param buffer - File content buffer
 * @param originalName - Original filename
 * @param mimeType - MIME type of the file
 * @param recordId - ID of the record this file is attached to
 * @param type - Type of attachment (file, cover, avatar, etc.)
 * @param user - User uploading the file
 * @param extTransaction - Optional external transaction
 * @returns Formatted attachment object with file details
 */
async function uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    recordId: string,
    type: string,
    user: User,
    extTransaction?: Transaction
) {
    // Validate input parameters
    if (!buffer || buffer.length === 0) {
        throw Errors.badRequest(translate("File buffer is required and cannot be empty"));
    }
    if (!recordId || !user) {
        throw Errors.badRequest(translate("Record ID and user are required"));
    }

    const hash = calculateHash(buffer);
    return persistUploadedFile(
        hash,
        buffer.length,
        () => writeOwnedStorageFile(UPLOAD_DIR, hash, buffer),
        originalName,
        mimeType,
        recordId,
        type,
        user,
        extTransaction
    );
}

async function persistUploadedFile(
    hash: string,
    size: number,
    publish: () => boolean | Promise<boolean>,
    originalName: string,
    mimeType: string,
    recordId: string,
    type: string,
    user: User,
    extTransaction?: Transaction
) {
    if (!Number.isSafeInteger(size) || size <= 0) {
        throw Errors.badRequest(translate("File buffer is required and cannot be empty"));
    }
    if (!recordId || !user) {
        throw Errors.badRequest(translate("Record ID and user are required"));
    }

    let createdFile = false;
    let publishedStorage = false;
    try {
        return await withTransaction(extTransaction, async transaction => {
            await assertAttachmentParentWritable(recordId, type, transaction);
            await lockContentHash(transaction, hash);
            // Store file without extension, using only the hash
            const filePath = join(UPLOAD_DIR, hash);

            // Hashes identify global physical objects; tenant authorization remains on attachments.
            let file = await FileEntity.findOne({
                where: { hash },
                transaction,
            });

            if (file?.get("deleted")) {
                // File exists but is marked as deleted, update it to be undeleted
                await file.update({ deleted: null, deletedBy: null }, { transaction });
            }

            if (!file) {
                // Create new file record
                file = await FileEntity.create(
                    {
                        hash,
                        mimeType,
                        size,
                        tenant: user.tenant,
                        createdBy: user.id,
                        updatedBy: user.id,
                    },
                    { transaction }
                );
                createdFile = true;
            }

            publishedStorage = await publish();
            if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
                const smallPreviewPath = join(PREVIEW_DIR, `${hash}_small.jpg`);
                const largePreviewPath = join(PREVIEW_DIR, `${hash}_large.jpg`);
                if (!existsSync(smallPreviewPath) && !existsSync(largePreviewPath)) {
                    try {
                        await ThumbnailService.generateMultipleThumbnails(
                            filePath,
                            PREVIEW_DIR,
                            hash,
                            mimeType
                        );
                    } catch (error) {
                        console.error(`Failed to generate thumbnails for file ${hash}:`, error);
                    }
                }
            }
            const hasPreview =
                existsSync(join(PREVIEW_DIR, `${hash}_small.jpg`)) ||
                existsSync(join(PREVIEW_DIR, `${hash}_large.jpg`));

            // Create attachment record
            const attachment = await AttachmentEntity.create(
                {
                    fileId: file.get("id") as unknown as string,
                    recordId,
                    originalName: originalName || null,
                    type: type ?? "file", // Default type
                    hasPreview,
                    tenant: user.tenant,
                    createdBy: user.id,
                    updatedBy: user.id,
                },
                { transaction }
            );

            // Return the result using the helper function for consistency
            const result = formatAttachmentObject(attachment, file);

            invalidateApiCacheForCurrentRequest();
            return result;
        });
    } catch (error) {
        // A failed standalone upload rolls back its new database row, but its bytes have
        // already been written. Reacquire the hash lock and remove them only when no
        // concurrent successful upload left a live attachment behind.
        if (!extTransaction && (createdFile || publishedStorage)) {
            try {
                await sequelize.transaction(async cleanupTransaction => {
                    await lockContentHash(cleanupTransaction, hash);
                    const files = await FileEntity.findAll({
                        where: { hash },
                        transaction: cleanupTransaction,
                    });
                    for (const file of files) {
                        if (
                            (await countGlobalLiveAttachments(String(file.get("id")), cleanupTransaction)) > 0
                        ) {
                            return;
                        }
                    }
                    await unlinkOwnedStorageFile(UPLOAD_DIR, hash);
                    await unlinkOwnedStorageFile(PREVIEW_DIR, `${hash}_small.jpg`);
                    await unlinkOwnedStorageFile(PREVIEW_DIR, `${hash}_large.jpg`);
                });
            } catch {
                console.error("Failed to clean up unreferenced upload file");
            }
        }
        throw error;
    }
}

/**
 * Get files attached to a record
 * @param recordId - ID of the record to get attachments for
 * @param user - User requesting the attachments
 * @returns Array of formatted attachment objects
 */
async function getAttachments(recordId: string, type?: FILES_TYPE) {
    const user = getCurrentUser();

    const filter: any = {
        recordId,
        tenant: user.tenant,
        deleted: null,
    };

    if (type) {
        await assertAttachmentParentVisible(recordId, type);
        filter.type = type;
    }

    const attachments = await AttachmentEntity.findAll({
        where: filter,
        include: [
            {
                model: FileEntity,
                as: "File",
                required: true,
            },
        ],
    });

    if (!type) {
        for (const attachmentType of new Set(attachments.map(row => row.get("type") as string))) {
            await assertAttachmentParentVisible(recordId, attachmentType);
        }
    }

    return attachments.map(attachment => {
        const file = attachment.get("File") as any;
        return formatAttachmentObject(attachment, file);
    });
}

/**
 * Get file attachment by ID
 * @param id - ID of the attachment to get
 * @returns Formatted attachment object
 */
async function getAttachment(id: string) {
    const user = getCurrentUser();

    const filter: any = {
        id,
        tenant: user.tenant,
        deleted: null,
    };

    const attachment = await AttachmentEntity.findOne({
        where: filter,
        include: [
            {
                model: FileEntity,
                as: "File",
                required: true,
            },
        ],
    });

    if (!attachment) {
        throw Errors.notFound("File not found");
    }

    await assertAttachmentParentVisible(
        attachment.get("recordId") as string,
        attachment.get("type") as string
    );

    const file = attachment.get("File") as any;
    return formatAttachmentObject(attachment, file);
}

/**
 * Download file by attachment ID with specific original filename
 */
async function download(
    attachmentId: string
): Promise<{ buffer: Buffer; mimeType: string; originalName: string } | null> {
    const user = getCurrentUser();
    const attachment = await AttachmentEntity.findOne({
        where: { id: attachmentId, tenant: user.tenant, deleted: null },
        include: [
            {
                model: FileEntity,
                as: "File",
                required: true,
            },
        ],
    });

    if (!attachment) {
        return null;
    }

    await assertAttachmentParentVisible(
        attachment.get("recordId") as string,
        attachment.get("type") as string
    );

    const file = attachment.get("File") as any;
    // Construct full path from relative path
    const fullPath = join(UPLOAD_DIR, file.hash);
    if (!existsSync(fullPath)) {
        return null;
    }

    const buffer = readFileSync(fullPath);
    return {
        buffer,
        mimeType: file.mimeType,
        originalName: attachment.get("originalName") as string,
    };
}

/**
 * Delete file attachment
 * @param attachmentId - ID of the attachment to remove
 * @param user - User performing the removal
 * @param extTransaction - Optional external transaction
 * @returns Formatted attachment object of the removed attachment
 */
async function deleteByAttachment(attachmentId: string, extTransaction?: Transaction) {
    const user = getCurrentUser();
    return withTransaction(extTransaction, async transaction => {
        // Get the attachment with file data before deletion
        const attachment = await AttachmentEntity.findOne({
            where: { id: attachmentId, tenant: user.tenant },
            include: [
                {
                    model: FileEntity,
                    as: "File",
                    required: true,
                },
            ],
            transaction,
        });

        if (!attachment) {
            throw Errors.notFound(translate("Attachment not found"));
        }

        await assertAttachmentParentWritable(
            attachment.get("recordId") as string,
            attachment.get("type") as string,
            transaction
        );

        // Prepare the return object using the helper function
        const file = attachment.get("File") as any;
        const attachmentObject = formatAttachmentObject(attachment, file);

        // Perform soft deletion
        await softDeleteAttachment(attachment, transaction);

        invalidateApiCacheForCurrentRequest();
        return attachmentObject;
    });
}

/**
 * Delete attachments by record ID and type
 * @param recordId - ID of the record to delete attachments for
 * @param type - Type of attachments to delete
 * @param user - User performing the deletion
 * @param extTransaction - Optional external transaction
 * @returns Array of formatted attachment objects that were deleted
 */
async function deleteByRecord(recordId: string, type: FILES_TYPE, extTransaction?: Transaction) {
    const user = getCurrentUser();
    return withTransaction(extTransaction, async transaction => {
        await assertAttachmentParentWritable(recordId, type, transaction);
        // Get all attachments for the record with the specified type
        const attachments = await AttachmentEntity.findAll({
            where: {
                recordId,
                type,
                tenant: user.tenant,
                deleted: null,
            },
            include: [
                {
                    model: FileEntity,
                    as: "File",
                    required: true,
                },
            ],
            transaction,
        });

        if (attachments.length === 0) {
            return [];
        }

        const deletedAttachments = [];

        for (const attachment of attachments) {
            // Prepare the return object using the helper function
            const file = attachment.get("File") as any;
            const attachmentObject = formatAttachmentObject(attachment, file);

            // Perform soft deletion
            await softDeleteAttachment(attachment, transaction);

            deletedAttachments.push(attachmentObject);
        }

        invalidateApiCacheForCurrentRequest();
        return deletedAttachments;
    });
}

/**
 * Get preview image by attachment ID
 * @param attachmentId - The attachment ID to get preview for
 * @param user - The user making the request
 * @param size - The size of the preview ('small' or 'large')
 * @returns Promise resolving to preview buffer and mime type, or null if not found
 */
async function getPreviewByAttachmentId(
    attachmentId: string,
    size: "small" | "large" = "large"
): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const user = getCurrentUser();
    const attachment = await AttachmentEntity.findOne({
        where: {
            id: attachmentId,
            tenant: user.tenant,
            deleted: null,
        },
        include: [
            {
                model: FileEntity,
                as: "File",
            },
        ],
    });

    if (!attachment || !attachment.get("File")) {
        return null;
    }

    await assertAttachmentParentVisible(
        attachment.get("recordId") as string,
        attachment.get("type") as string
    );

    const file = attachment.get("File") as any;

    if (!file) {
        return null;
    }

    // Generate preview path based on file hash and size
    const hash = file.get("hash") as string;
    const previewPath = path.join(PREVIEW_DIR, `${hash}_${size}.jpg`);

    if (!existsSync(previewPath)) {
        return null;
    }

    let buffer = readFileSync(previewPath);

    return {
        buffer,
        mimeType: "image/jpeg",
    };
}

// Streaming upload function for large files
const uploadFileStream = async (
    stream: ReadableStream<Uint8Array>,
    fileName: string,
    mimeType: string,
    recordId: string,
    user: User,
    type: string = "file",
    extTransaction?: Transaction,
    signal?: AbortSignal
): Promise<IAttachment> => {
    const uploadId = crypto.randomUUID();
    const tempPath = join(UPLOAD_DIR, `.upload-${uploadId}.tmp`);

    try {
        // Authorize before consuming request bytes, then enforce the limit on actual bytes.
        await assertAttachmentParentWritable(recordId, type, extTransaction);
        uploadProgress.set(uploadId, { progress: 0, total: 0, userId: String(user.id), tenant: user.tenant });
        const { size, hash } = await writeBoundedStreamToFile(
            stream,
            tempPath,
            MAX_UPLOAD_BYTES,
            progress => {
                uploadProgress.set(uploadId, {
                    progress,
                    total: 0,
                    userId: String(user.id),
                    tenant: user.tenant,
                });
            },
            60_000,
            signal
        );
        // Update progress with hash
        const progress = uploadProgress.get(uploadId);
        if (progress) {
            progress.hash = hash;
            progress.total = size;
            uploadProgress.set(uploadId, progress);
        }

        // Persist the authorized request-owned file without materializing it in memory.
        const result = await persistUploadedFile(
            hash,
            size,
            () => publishOwnedStorageFile(UPLOAD_DIR, tempPath, hash, size),
            fileName,
            mimeType,
            recordId,
            type,
            user,
            extTransaction
        );

        // Clean up progress tracking
        uploadProgress.delete(uploadId);

        return result;
    } catch (error) {
        // Clean up progress tracking on error
        uploadProgress.delete(uploadId);
        throw error;
    } finally {
        try {
            unlinkSync(tempPath);
        } catch (error: any) {
            if (error.code !== "ENOENT") throw error;
        }
    }
};

// Get streaming upload progress
const getStreamUploadProgress = (
    uploadId: string,
    userId: string,
    tenant: string
): { progress: number; total: number; hash?: string } | null => {
    return visibleUploadProgress(uploadProgress.get(uploadId), userId, tenant);
};

// Export all file-related operations
export const FilesLoader = {
    assertAttachmentParentWritable,
    // File upload operations
    uploadFile,
    uploadFileStream,
    getStreamUploadProgress,

    // File retrieval operations
    getAttachments,
    getAttachment,
    download,
    getPreviewByAttachmentId,

    // File deletion operations
    deleteByAttachment,
    deleteByRecord,
};
