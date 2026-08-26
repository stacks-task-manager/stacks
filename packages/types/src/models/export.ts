// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

/** Entity presenters supported by the shared export endpoint. */
export const EXPORT_ENTITY_TYPES = ["task", "project", "person", "company", "bookmark", "notepad"] as const;

/** Entity type accepted by an export request. */
export type ExportEntityType = (typeof EXPORT_ENTITY_TYPES)[number];

/** File formats supported by the export endpoint. */
export type ExportFormat = "pdf" | "html" | "json" | "excel";

/** Format-aware request contract shared by the app and server. */
export type ExportRequest =
    | { title?: string; format: "pdf"; type: ExportEntityType; data: unknown }
    | { title?: string; format: "html"; type: "notepad"; data: unknown }
    | { title?: string; format: "json" | "excel"; type: ExportEntityType; data: unknown };
