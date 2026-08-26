// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ExportEntityType } from "@stacks/types";
import { existsSync } from "fs";
import { join } from "path";

/** Exhaustive mapping from accepted entity types to bundled template filenames. */
export const PDF_TEMPLATE_REGISTRY: Readonly<Record<ExportEntityType, string>> = Object.freeze({
    task: "task.html",
    project: "project.html",
    person: "person.html",
    company: "company.html",
    bookmark: "bookmark.html",
    notepad: "notepad.html",
});

/** Resolves the bundled export asset directory in source and production layouts. */
export function exportStaticRoot(cwd: string = process.cwd()): string {
    const direct = join(cwd, "static", "export", "pdf");
    if (existsSync(direct)) return direct;
    return join(cwd, "packages", "server", "static", "export", "pdf");
}

/** Resolves a validated entity type to its fixed template path. */
export function resolvePdfTemplatePath(type: ExportEntityType, cwd: string = process.cwd()): string {
    return join(exportStaticRoot(cwd), PDF_TEMPLATE_REGISTRY[type]);
}
