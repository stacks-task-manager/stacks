// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Generic export endpoint: JSON, Excel, or PDF attachments from validated body.
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";
import { generateExcel } from "../services/export/generateExcel";
import { generatePdfFromHtml } from "../services/export/generatePdfFromHtml";
import { normalizeExportRows } from "../services/export/normalizeExportRows";
import { resolvePdfTemplatePath } from "../services/export/resolvePdfTemplate";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { validator } from "../middleware/validator";
import { ExportBodySchema } from "./schema/export";

const exportRouter = new Hono();

/** Strips unsafe filename characters and caps length for `Content-Disposition`. */
function sanitizeExportBasename(raw: string): string {
    const s = raw
        .trim()
        .replace(/[/\\:*?"<>|\u0000-\u001f]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return s.slice(0, 200) || "export";
}

/** Local date/time, safe for filenames (no `:`). Example: `2025-03-26_14-30-52`. */
function exportFilenameDateTime(d = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
        d.getMinutes()
    )}-${pad(d.getSeconds())}`;
}

/** Builds `base_datetime.ext` using {@link sanitizeExportBasename} and {@link exportFilenameDateTime}. */
function attachmentFilename(title: string | undefined | null, fallbackType: string, ext: string): string {
    const dateTime = exportFilenameDateTime();
    const basePart =
        title != null && title.trim() !== "" ? sanitizeExportBasename(title) : `export-${fallbackType}`;
    const reserved = dateTime.length + 1 + ext.length + 1;
    const maxBase = Math.max(8, 230 - reserved);
    const base = basePart.slice(0, maxBase);
    return `${base}_${dateTime}.${ext}`;
}

/** POST `/` — Streams an export file in the requested `format`. */
exportRouter.post(
    "/",
    validator(ExportBodySchema),
    asyncHandler(async (c: Context) => {
        const body = c.req.valid("json");
        const { title, format, data } = body;
        const typeLabel = body.type ?? "export";

        if (format === "json") {
            const json = JSON.stringify(data);
            return c.body(new Uint8Array(Buffer.from(json, "utf-8")), 200, {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${attachmentFilename(
                    title,
                    typeLabel,
                    "json"
                )}"`,
            });
        }

        if (format === "excel") {
            const { columns, rows } = normalizeExportRows(data);
            const buffer = await generateExcel(columns, rows);
            return c.body(new Uint8Array(buffer), 200, {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${attachmentFilename(
                    title,
                    typeLabel,
                    "xlsx"
                )}"`,
            });
        }

        const pdfType = body.type;
        const templatePath = resolvePdfTemplatePath(pdfType);
        if (!templatePath) {
            throw Errors.invalidInput(translate("No PDF template for this export type"));
        }

        const pdfBuffer = await generatePdfFromHtml(templatePath, { type: pdfType, data });
        return c.body(new Uint8Array(pdfBuffer), 200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${attachmentFilename(title, pdfType, "pdf")}"`,
        });
    })
);

export default exportRouter;
