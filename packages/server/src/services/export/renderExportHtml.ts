// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ExportEntityType } from "@stacks/types";
import { readFileSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";
import { presentPdfExport } from "./presenters";
import { exportStaticRoot, resolvePdfTemplatePath } from "./templateRegistry";

type CompiledTemplate = Handlebars.TemplateDelegate;
const templateCache = new Map<string, CompiledTemplate>();
let engine: typeof Handlebars | undefined;
let css: string | undefined;
let logo: string | undefined;

/** Creates the isolated Handlebars engine and registers export-only helpers. */
export function createExportHandlebars(): typeof Handlebars {
    const hb = Handlebars.create();
    hb.registerHelper("eq", (a: unknown, b: unknown) => a === b);
    hb.registerHelper("hasValues", (value: unknown) => Array.isArray(value) && value.length > 0);
    return hb;
}

function getEngine(root: string): typeof Handlebars {
    if (engine) return engine;
    engine = createExportHandlebars();
    const partialsDir = join(root, "partials");
    for (const name of ["header", "records", "footer"]) {
        engine.registerPartial(name, readFileSync(join(partialsDir, `${name}.html`), "utf8"));
    }
    return engine;
}

function compile(type: ExportEntityType, root: string): CompiledTemplate {
    const path = resolvePdfTemplatePath(type);
    const cached = templateCache.get(path);
    if (cached) return cached;
    const compiled = getEngine(root).compile(readFileSync(path, "utf8"));
    templateCache.set(path, compiled);
    return compiled;
}

/** Clears process-local templates and assets, primarily for tests and development. */
export function clearExportTemplateCache(): void {
    templateCache.clear();
    engine = undefined;
    css = undefined;
    logo = undefined;
}

/** Compiles a sanitized, self-contained HTML export for Chromium or direct download. */
export function renderExportHtml(
    type: ExportEntityType,
    data: unknown,
    options: { locale: string; title?: string; generatedAt?: Date }
): { html: string; generatedAt: string } {
    const root = exportStaticRoot();
    css ??= readFileSync(join(root, "pdf-export.css"), "utf8");
    logo ??= readFileSync(join(root, "assets", "stacks-logo.svg"), "utf8");
    const view = presentPdfExport(type, data, options);
    const html = compile(
        type,
        root
    )({
        ...view,
        inlineCss: new Handlebars.SafeString(css),
        logo: new Handlebars.SafeString(logo),
        richHtml: new Handlebars.SafeString(view.richHtml ?? ""),
    });
    return { html, generatedAt: view.generatedAt };
}
