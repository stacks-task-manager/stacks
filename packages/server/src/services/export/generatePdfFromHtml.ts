// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ExportEntityType } from "@stacks/types";
import { translate } from "@stacks/translations";
import { Errors } from "../../errors";
import { Logger } from "../../utils/logger";
import { printHtmlToPdfWithChrome } from "./chromePdfFromHtml";
import { renderExportHtml } from "./renderExportHtml";

/** Input required to present and print one entity export. */
export interface PdfTemplateContext {
    type: ExportEntityType;
    data: unknown;
    title?: string;
    locale: string;
    /** Optional fixed timestamp used by deterministic previews and tests. */
    generatedAt?: Date;
}

/**
 * Compiles Handlebars HTML and prints to PDF with headless Chromium through Playwright.
 */
export async function generatePdfFromHtml(context: PdfTemplateContext): Promise<Buffer> {
    try {
        const rendered = renderExportHtml(context.type, context.data, context);
        return await printHtmlToPdfWithChrome(rendered.html, { footerText: rendered.generatedAt });
    } catch (error) {
        Logger.error(
            "PDF export rendering failed",
            error instanceof Error ? error : new Error(String(error)),
            {
                type: context.type,
                locale: context.locale,
            }
        );
        throw Errors.internal(translate("PDF export failed Chromium required for PDF printing"));
    }
}
