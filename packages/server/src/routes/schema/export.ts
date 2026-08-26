// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Unified export request: format, entity type, and arbitrary JSON `data` for templates.
 */
import { EXPORT_ENTITY_TYPES } from "@stacks/types";
import { z } from "zod/v4";

const EntityTypeSchema = z.enum(EXPORT_ENTITY_TYPES);
const PdfBodySchema = z.object({
    title: z.string().optional(),
    format: z.literal("pdf"),
    type: EntityTypeSchema,
    data: z.json(),
});
const HtmlBodySchema = z.object({
    title: z.string().optional(),
    format: z.literal("html"),
    type: z.literal("notepad"),
    data: z.json(),
});
const DataBodySchema = z.object({
    title: z.string().optional(),
    format: z.enum(["json", "excel"]),
    type: EntityTypeSchema,
    data: z.json(),
});

/** POST `/api/export` body: chooses renderer and attaches client data. */
export const ExportBodySchema = z.discriminatedUnion("format", [
    PdfBodySchema,
    HtmlBodySchema,
    DataBodySchema,
]);

/** Inferred TypeScript type for {@link ExportBodySchema}. */
export type ExportBody = z.infer<typeof ExportBodySchema>;
