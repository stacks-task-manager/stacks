// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AttachmentEntity, FileEntity } from "@stacks/db";
import { Errors } from "../errors";
import { FILES_TYPE, type IAttachment } from "@stacks/types";
import crypto, { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path, { join } from "path";
import { Transaction } from "sequelize";
import { ThumbnailService } from "../services/thumbnailService";
import type { User } from "../types/user";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { withTransaction } from "./utils";
import { formatBytes } from "../utils/files";
import { translate } from "@stacks/translations";

// Constants for file handling
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Streaming upload progress tracking
const uploadProgress = new Map<string, { progress: number; total: number; hash?: string }>();

// Set up associations
if (!AttachmentEntity.associations.File) {
    AttachmentEntity.belongsTo(FileEntity, { foreignKey: "fileId", as: "File" });
}
if (!FileEntity.associations.Attachments) {
    FileEntity.hasMany(AttachmentEntity, { foreignKey: "fileId", as: "Attachments" });
}

const UPLOAD_DIR = join(process.cwd(), "uploads");
const PREVIEW_DIR = join(process.cwd(), "previews");

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
    // Soft delete the attachment
    await attachment.update(
        {
            deleted: new Date(),
            deletedBy: user.id,
        },
        { transaction }
    );

    const fileId = attachment.get("fileId") as string;

    // Check if file has other non-deleted attachments
    const remainingAttachments = await AttachmentEntity.count({
        where: {
            fileId,
            tenant: user.tenant,
            deleted: null,
        },
        transaction,
    });

    // If no remaining attachments, delete the actual file
    if (remainingAttachments === 0) {
        const fileEntity = await FileEntity.findOne({
            where: { id: fileId, tenant: user.tenant },
            transaction,
        });

        if (fileEntity) {
            const filePath = join(UPLOAD_DIR, fileEntity.get("hash") as string);
            const fileHash = fileEntity.get("hash") as string;

            // Only delete physical files if DELETE_FILES environment variable is set to true
            const shouldDeleteFiles = process.env.DELETE_FILES === "true";

            if (shouldDeleteFiles) {
                // Delete main file
                if (existsSync(filePath)) {
                    unlinkSync(filePath);
                }

                // Delete thumbnail files if they exist
                const uploadsDir = path.dirname(filePath);
                const thumbnailsDir = path.join(uploadsDir, "previews");
                const smallThumbnailPath = path.join(thumbnailsDir, `${fileHash}_small.jpg`);
                const largeThumbnailPath = path.join(thumbnailsDir, `${fileHash}_large.jpg`);

                if (existsSync(smallThumbnailPath)) {
                    unlinkSync(smallThumbnailPath);
                }

                if (existsSync(largeThumbnailPath)) {
                    unlinkSync(largeThumbnailPath);
                }
            }

            await fileEntity.update(
                {
                    deleted: new Date(),
                    deletedBy: user.id,
                },
                { transaction }
            );
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

    return withTransaction(extTransaction, async transaction => {
        const hash = calculateHash(buffer);
        const size = buffer.length;
        // Store file without extension, using only the hash
        const filePath = join(UPLOAD_DIR, hash);

        // Check if file already exists
        let file = await FileEntity.findOne({
            where: { hash, tenant: user.tenant },
            transaction,
        });

        if (file?.get("deleted")) {
            // File exists but is marked as deleted, update it to be undeleted
            await file.update({ deleted: null, deletedBy: null }, { transaction });
        }

        // Initialize hasPreview flag
        let hasPreview = false;

        if (!file) {
            // Write file to disk first
            writeFileSync(filePath, buffer);

            // Generate preview thumbnails for supported image types
            if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
                try {
                    const thumbnailResult = await ThumbnailService.generateMultipleThumbnails(
                        filePath,
                        PREVIEW_DIR,
                        hash,
                        mimeType
                    );
                    hasPreview = !!(thumbnailResult?.small || thumbnailResult?.large);
                } catch (error) {
                    console.error(`Failed to generate thumbnails for file ${hash}:`, error);
                    // Continue execution even if thumbnail generation fails
                }
            }

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
        }

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
}

/**
 * Check if file with hash exists and create attachment if it does
 * @param hash - File hash to check
 * @param recordId - ID of the record to attach to
 * @param type - Type of attachment
 * @param originalName - Original filename
 * @param user - User creating the attachment
 * @param extTransaction - Optional external transaction
 * @returns Formatted attachment object if file exists, null otherwise
 */
async function checkExistingFileAndCreateAttachment(
    hash: string,
    recordId: string,
    type: string,
    originalName: string,
    user: User,
    extTransaction?: Transaction
): Promise<IAttachment | null> {
    return withTransaction(extTransaction, async transaction => {
        // Check if file exists and is not deleted
        const file = await FileEntity.findOne({
            where: {
                hash,
                tenant: user.tenant,
                deleted: null,
            },
            transaction,
        });

        if (!file) {
            return null;
        }

        const hasPreview = SUPPORTED_IMAGE_TYPES.includes(file.get("mimeType") as string);

        // File exists, create new attachment
        const attachment = await AttachmentEntity.create(
            {
                fileId: file.get("id") as unknown as string,
                recordId,
                originalName: originalName || null,
                type: type ?? "file",
                hasPreview,
                tenant: user.tenant,
                createdBy: user.id,
                updatedBy: user.id,
            },
            { transaction }
        );

        const formatted = formatAttachmentObject(attachment, file);
        invalidateApiCacheForCurrentRequest();
        return formatted;
    });
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
    extTransaction?: Transaction
): Promise<IAttachment> => {
    const uploadId = crypto.randomUUID();
    const chunks: Buffer[] = [];
    let totalSize = 0;

    try {
        // Initialize progress tracking
        uploadProgress.set(uploadId, { progress: 0, total: 0 });

        // Read stream in chunks
        const reader = stream.getReader();
        let done = false;

        while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;

            if (value) {
                const chunk = Buffer.from(value);
                chunks.push(chunk);
                totalSize += chunk.length;

                // Update progress
                const progress = uploadProgress.get(uploadId);
                if (progress) {
                    progress.progress = totalSize;
                    uploadProgress.set(uploadId, progress);
                }
            }
        }

        // Combine all chunks into final buffer
        const buffer = Buffer.concat(chunks);

        // Calculate hash
        const hash = calculateHash(buffer);

        // Update progress with hash
        const progress = uploadProgress.get(uploadId);
        if (progress) {
            progress.hash = hash;
            progress.total = totalSize;
            uploadProgress.set(uploadId, progress);
        }

        // Use existing uploadFile logic
        const result = await uploadFile(buffer, fileName, mimeType, recordId, type, user, extTransaction);

        // Clean up progress tracking
        uploadProgress.delete(uploadId);

        return result;
    } catch (error) {
        // Clean up progress tracking on error
        uploadProgress.delete(uploadId);
        throw error;
    }
};

// Get streaming upload progress
const getStreamUploadProgress = (
    uploadId: string
): { progress: number; total: number; hash?: string } | null => {
    return uploadProgress.get(uploadId) || null;
};

// Export all file-related operations
export const FilesLoader = {
    // File upload operations
    uploadFile,
    uploadFileStream,
    getStreamUploadProgress,
    checkExistingFileAndCreateAttachment,

    // File retrieval operations
    getAttachments,
    getAttachment,
    download,
    getPreviewByAttachmentId,

    // File deletion operations
    deleteByAttachment,
    deleteByRecord,
};
