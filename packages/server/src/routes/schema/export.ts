// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Unified export request: format, entity type, and arbitrary JSON `data` for templates.
 */
import { z } from "zod/v4";

/** Allowed `type` values for PDF/JSON/Excel exports. */
export const EXPORT_ENTITY_TYPES = ["task", "notepad", "project", "person"] as const;
export type ExportEntityType = (typeof EXPORT_ENTITY_TYPES)[number];

/** POST `/api/export` body: chooses renderer and attaches client data. */
export const ExportBodySchema = z.object({
    title: z.string().optional(),
    format: z.enum(["pdf", "json", "excel", "html"]),
    type: z.enum(EXPORT_ENTITY_TYPES),
    data: z.json(),
});

/** Inferred TypeScript type for {@link ExportBodySchema}. */
export type ExportBody = z.infer<typeof ExportBodySchema>;
