// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { readFileSync } from "fs";
import { join, sep } from "path";
import { pathToFileURL } from "url";
import Handlebars from "handlebars";
import { translate } from "@stacks/translations";
import { Errors } from "../../errors";
import { printHtmlToPdfWithChrome } from "./chromePdfFromHtml";

export interface PdfTemplateContext {
    type: string;
    data: unknown;
}

function createHandlebars(): typeof Handlebars {
    const hb = Handlebars.create();
    hb.registerHelper("json", (ctx: unknown) => JSON.stringify(ctx, null, 2));
    hb.registerHelper("isString", (v: unknown) => typeof v === "string");
    hb.registerHelper("isArray", (v: unknown) => Array.isArray(v));
    hb.registerHelper("formatDate", (v: unknown) => {
        if (v == null || v === "") {
            return "—";
        }
        const d = new Date(v as string);
        if (Number.isNaN(d.getTime())) {
            return String(v);
        }
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    });
    hb.registerHelper("coalesce", (...args: unknown[]) => {
        const values = args.slice(0, -1);
        for (const x of values) {
            if (x != null && x !== "") {
                return String(x);
            }
        }
        return "—";
    });
    hb.registerHelper("personName", (p: unknown) => {
        if (p == null || typeof p !== "object") {
            return "Person";
        }
        const o = p as Record<string, unknown>;
        const parts = [o.firstName, o.lastName].filter(x => x != null && x !== "");
        const full = parts.join(" ").trim();
        if (full) {
            return full;
        }
        for (const k of ["nickname", "email", "id"] as const) {
            const v = o[k];
            if (v != null && v !== "") {
                return String(v);
            }
        }
        return "Person";
    });
    hb.registerHelper("eq", (a: unknown, b: unknown) => a === b);
    hb.registerHelper("ne", (a: unknown, b: unknown) => a !== b);
    return hb;
}

/**
 * Without an HTTP origin, absolute `/static/...` URLs do not resolve for this HTML.
 * A file:// base pointing at `static/` allows the same relative paths as other static pages.
 */
function injectBaseHref(html: string): string {
    const staticDir = join(process.cwd(), "static");
    const basePath = staticDir.endsWith(sep) ? staticDir : staticDir + sep;
    const baseHref = pathToFileURL(basePath).href;
    const baseTag = `<base href="${baseHref}">`;
    const headOpen = /<head[^>]*>/i.exec(html);
    if (headOpen) {
        const insertAt = headOpen.index + headOpen[0].length;
        return html.slice(0, insertAt) + baseTag + html.slice(insertAt);
    }
    return `<!DOCTYPE html><html lang="en"><head>${baseTag}<meta charset="utf-8" /></head><body>${html}</body></html>`;
}

/**
 * Compiles Handlebars HTML and prints to PDF with headless Chromium (Puppeteer).
 */
export async function generatePdfFromHtml(templatePath: string, context: PdfTemplateContext): Promise<Buffer> {
    const templateSource = readFileSync(templatePath, "utf-8");
    const hb = createHandlebars();
    const template = hb.compile(templateSource);
    const html = injectBaseHref(
        template({
            ...context,
            generatedAt: new Date().toISOString(),
        })
    );

    try {
        return await printHtmlToPdfWithChrome(html);
    } catch {
        throw Errors.internal(translate("PDF export failed Chromium required for PDF printing"));
    }
}
