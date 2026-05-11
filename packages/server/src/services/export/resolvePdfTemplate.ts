// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { existsSync } from "fs";
import { join } from "path";

/**
 * Returns absolute path to the Handlebars HTML template for PDF export, or null if missing.
 */
export function resolvePdfTemplatePath(entityType: string, cwd: string = process.cwd()): string | null {
    const filePath = join(cwd, "static", "export", "pdf", `${entityType}.html`);
    return existsSync(filePath) ? filePath : null;
}
