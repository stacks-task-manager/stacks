// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Workspace documents with tag sidebar data, archive toggles, and CRUD.
 */
import type { Context } from "hono";
import { Hono } from "hono";

import { validator } from "../middleware/validator";
import { DocumentsLoader } from "../loaders/documents";
import { TagsLoader } from "../loaders/tags";
import { asyncHandler } from "../utils/errorHandler";
import { DocumentCreateSchema, DocumentUpdateSchema } from "./schema/document";

const documents = new Hono();

/** POST `/` — Creates a new document. */
documents.post(
    "/",
    validator(DocumentCreateSchema),
    asyncHandler(async (c: Context) => {
        const documentData = c.req.valid("json");
        const newDocument = await DocumentsLoader.create(documentData);
        return c.replySuccess(newDocument);
    })
);

/** GET `/` — Lists all documents along with available tags. */
documents.get(
    "/",
    asyncHandler(async (c: Context) => {
        const documents = await DocumentsLoader.getAll();
        const tags = await TagsLoader.getAll();
        return c.replySuccess({ documents, tags });
    })
);

/** PATCH `/:id` — Updates a document. */
documents.patch(
    "/:id",
    validator(DocumentUpdateSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const documentData = c.req.valid("json");
        await DocumentsLoader.update(id, documentData);
        return c.replySuccess();
    })
);

/** DELETE `/:id` — Removes a document when found. */
documents.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        await DocumentsLoader.remove(id);
        return c.replySuccess({ success: true });
    })
);

/** POST `/:id/archive` — Sets `archived` timestamp on the document. */
documents.post(
    "/:id/archive",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        await DocumentsLoader.update(id, { archived: new Date() });
        return c.replySuccess();
    })
);

/** POST `/:id/unarchive` — Clears `archived` on the document. */
documents.post(
    "/:id/unarchive",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        await DocumentsLoader.update(id, { archived: null });
        return c.replySuccess();
    })
);

export default documents;
