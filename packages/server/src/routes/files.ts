// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * File streaming upload/download, thumbnails, and attachment listing by record.
 */
import { FILES_TYPE } from "@stacks/types";
import { Hono, type Context } from "hono";
import { lookup } from "mime-types";
import { translate } from "@stacks/translations";

import { FilesLoader } from "../loaders/files";
import { validator } from "../middleware/validator";
import type { User } from "../types";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";
import { FilesFilterSchema } from "./schema/files";

const files = new Hono();

/** Client-reported MIME is untrusted; reconcile with file name when possible. */
function resolveUploadMimeType(clientMime: string | undefined, fileName: string): string {
    const fallback = "application/octet-stream";
    const trimmed = (clientMime ?? "").trim().slice(0, 128);
    const looksLikeMime = /^[\w-]+\/[\w.+-]+$/i.test(trimmed);
    const fromName = lookup(fileName) || undefined;
    if (!looksLikeMime) {
        return fromName ?? fallback;
    }
    if (fromName && trimmed.split("/")[0] !== fromName.split("/")[0]) {
        return fromName;
    }
    return trimmed;
}

/** POST `/upload` — Streaming upload; metadata is carried on `x-file-*` headers. */
files.post(
    "/upload",
    asyncHandler(async (c: Context) => {
        const user = c.get("user") as User;
        const body = c.req.raw.body;

        if (!body) {
            throw Errors.badRequest(translate("No file stream provided"));
        }

        const fileName = c.req.header("x-file-name");
        const mimeType = resolveUploadMimeType(c.req.header("x-file-type"), fileName ?? "");
        const recordIdRaw = c.req.header("x-record-id");
        const type = c.req.header("x-file-category") || "file";

        if (!fileName || !recordIdRaw) {
            throw Errors.badRequest(translate("Missing required headers"));
        }

        const recordId = recordIdRaw;
        parseUuidParam(recordId);

        const result = await FilesLoader.uploadFileStream(body, fileName, mimeType, recordId, user, type);
        return c.replySuccess(result);
    })
);

/** GET `/stream-progress/:uploadId` — Progress for an in-flight streaming upload. */
files.get("/stream-progress/:uploadId", async c => {
    const uploadId = c.req.param("uploadId");
    try {
        const progress = FilesLoader.getStreamUploadProgress(uploadId);
        if (!progress) {
            return c.replyError(Errors.notFound(translate("Upload not found")));
        }
        return c.replySuccess(progress);
    } catch (error: any) {
        return c.replyError(error as Error, undefined, 500);
    }
});

/** POST `/check-existing` — Reuses an existing file by hash by creating a fresh attachment row. */
files.post("/check-existing", async c => {
    try {
        const user = c.get("user") as User;
        const { hash, recordId, type, originalName } = await c.req.json();

        if (!hash || !recordId || !type || !originalName) {
            return c.replyError(Errors.badRequest(translate("Missing required parameters")));
        }

        const existingAttachment = await FilesLoader.checkExistingFileAndCreateAttachment(
            hash,
            recordId,
            type,
            originalName,
            user
        );

        return c.replySuccess(existingAttachment ?? null);
    } catch (error) {
        return c.replyError(error as Error);
    }
});

/** GET `/attachments/:recordId` — Lists attachments for a record, optionally filtered by type. */
files.get(
    "/attachments/:recordId",
    validator(FilesFilterSchema, "query"),
    asyncHandler(async (c: Context) => {
        const recordId = c.req.param("recordId")!;
        const { type } = c.req.valid("query");
        parseUuidParam(recordId);

        const attachedFiles = await FilesLoader.getAttachments(recordId, type);
        return c.replySuccess(attachedFiles);
    })
);

/** GET `/attachment/:attachmentId` — Returns a single attachment's metadata. */
files.get(
    "/attachment/:attachmentId",
    asyncHandler(async (c: Context) => {
        const attachmentId = c.req.param("attachmentId")!;
        parseUuidParam(attachmentId);

        const attachment = await FilesLoader.getAttachment(attachmentId);
        return c.replySuccess(attachment);
    })
);

/** GET `/preview/:attachmentId` — Serves a rendered preview (`small`/`large`) or HTML wrapper (`preview`). */
files.get(
    "/preview/:attachmentId",
    asyncHandler(async (c: Context) => {
        const attachmentId = c.req.param("attachmentId")!;
        const sizeParam = c.req.query("size") as "small" | "large" | "preview" | undefined;
        const size = sizeParam === "small" ? "small" : "large";
        parseUuidParam(attachmentId);

        if (sizeParam === "preview") {
            const attachment = await FilesLoader.getAttachment(attachmentId);
            return c.replyHtml("file-preview", {
                ...attachment,
                previewUrl: `/api/files/preview/${attachmentId}?size=large`,
            });
        }

        const previewData = await FilesLoader.getPreviewByAttachmentId(attachmentId, size);
        if (!previewData) {
            throw Errors.notFound(translate("Preview not found"));
        }

        return c.body(new Uint8Array(previewData.buffer), 200, {
            "Content-Type": previewData.mimeType,
            "Content-Length": previewData.buffer.length.toString(),
            "Cache-Control": "public, max-age=3600",
        });
    })
);

/** GET `/download/:attachmentId` — Forces a file download with the original name. */
files.get(
    "/download/:attachmentId",
    asyncHandler(async (c: Context) => {
        const attachmentId = c.req.param("attachmentId")!;
        parseUuidParam(attachmentId);

        const fileData = await FilesLoader.download(attachmentId);
        if (!fileData) {
            throw Errors.notFound(translate("File not found"));
        }

        return c.body(new Uint8Array(fileData.buffer), 200, {
            "Content-Type": fileData.mimeType,
            "Content-Disposition": `attachment; filename="${fileData.originalName}"`,
            "Content-Length": fileData.buffer.length.toString(),
        });
    })
);

/** DELETE `/attachment/:attachmentId` — Deletes a single attachment. */
files.delete(
    "/attachment/:attachmentId",
    asyncHandler(async (c: Context) => {
        const attachmentId = c.req.param("attachmentId")!;
        parseUuidParam(attachmentId);

        const deletedAttachment = await FilesLoader.deleteByAttachment(attachmentId);
        return c.replySuccess(deletedAttachment);
    })
);

/** DELETE `/record/:recordId/:type` — Deletes all attachments for a record of a given `FILES_TYPE`. */
files.delete(
    "/record/:recordId/:type",
    asyncHandler(async (c: Context) => {
        const recordId = c.req.param("recordId")!;
        const type = c.req.param("type") as FILES_TYPE;
        parseUuidParam(recordId);

        if (!Object.values(FILES_TYPE).includes(type)) {
            throw Errors.badRequest(translate("Invalid file type"));
        }

        const deletedAttachments = await FilesLoader.deleteByRecord(recordId, type);
        return c.replySuccess(deletedAttachments);
    })
);

export default files;
