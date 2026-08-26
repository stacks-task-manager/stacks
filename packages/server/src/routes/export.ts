// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Generic export endpoint: JSON, Excel, or PDF attachments from validated body.
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { generateExcel } from "../services/export/generateExcel";
import { generatePdfFromHtml } from "../services/export/generatePdfFromHtml";
import { normalizeExportRows } from "../services/export/normalizeExportRows";
import { renderExportHtml } from "../services/export/renderExportHtml";
import { asyncHandler } from "../utils/errorHandler";
import { validator } from "../middleware/validator";
import { ExportBodySchema } from "./schema/export";

const exportRouter = new Hono();

/** Strips unsafe filename characters and caps length for `Content-Disposition`. */
export function sanitizeExportBasename(raw: string): string {
    const s = raw
        .trim()
        .replace(/[/\\:*?"<>|\u0000-\u001f]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return s.slice(0, 200) || "export";
}

/** Local date/time, safe for filenames (no `:`). Example: `2025-03-26_14-30-52`. */
export function exportFilenameDateTime(d = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
        d.getMinutes()
    )}-${pad(d.getSeconds())}`;
}

/** Builds `base_datetime.ext` using {@link sanitizeExportBasename} and {@link exportFilenameDateTime}. */
export function attachmentFilename(
    title: string | undefined | null,
    fallbackType: string,
    ext: string,
    generatedAt = new Date()
): string {
    const dateTime = exportFilenameDateTime(generatedAt);
    const basePart =
        title != null && title.trim() !== "" ? sanitizeExportBasename(title) : `export-${fallbackType}`;
    const reserved = dateTime.length + 1 + ext.length + 1;
    const maxBase = Math.max(8, 230 - reserved);
    const base = basePart.slice(0, maxBase);
    return `${base}_${dateTime}.${ext}`;
}

/** Builds an RFC 6266/RFC 5987 attachment header with an ASCII fallback and UTF-8 filename. */
export function attachmentContentDisposition(filename: string): string {
    const asciiFallback =
        filename
            .normalize("NFKD")
            .replace(/[^\x20-\x7e]+/g, "-")
            .replace(/["\\]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "export";
    const encoded = encodeURIComponent(filename).replace(
        /[!'()*]/g,
        character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
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
                "Content-Disposition": attachmentContentDisposition(
                    attachmentFilename(title, typeLabel, "json")
                ),
            });
        }

        if (format === "excel") {
            const { columns, rows } = normalizeExportRows(data);
            const buffer = await generateExcel(columns, rows);
            return c.body(new Uint8Array(buffer), 200, {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": attachmentContentDisposition(
                    attachmentFilename(title, typeLabel, "xlsx")
                ),
            });
        }

        const locale = c.get("locale");
        if (format === "html") {
            const rendered = renderExportHtml("notepad", data, { locale, title });
            return c.body(rendered.html, 200, {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": attachmentContentDisposition(
                    attachmentFilename(title, body.type, "html")
                ),
                "Content-Security-Policy":
                    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
            });
        }

        const pdfType = body.type;
        const pdfBuffer = await generatePdfFromHtml({ type: pdfType, data, locale, title });
        return c.body(new Uint8Array(pdfBuffer), 200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": attachmentContentDisposition(attachmentFilename(title, pdfType, "pdf")),
        });
    })
);

export default exportRouter;
