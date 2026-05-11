// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Loads Markdown prompt templates from `src/ai/prompts` and renders with Handlebars.
 */
import Handlebars from "handlebars";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Directory containing `*.md` prompt templates (next to this module at runtime).
 * `yarn build` copies `src/ai/prompts` → `dist/ai/prompts`.
 */
function promptsDirectory(): string {
    return join(__dirname, "prompts");
}

function resolveTemplateFilename(name: string): string {
    const trimmed = name.trim();
    const base = trimmed.endsWith(".md") ? trimmed.slice(0, -3) : trimmed;
    if (!base || base.includes("..") || base.includes("/") || base.includes("\\")) {
        throw new Error(`Invalid template name: ${name}`);
    }
    return join(promptsDirectory(), `${base}.md`);
}

/**
 * Load a markdown prompt and interpolate `{{variableName}}` placeholders using Handlebars.
 *
 * @param name - Template file name, e.g. `"system-chat"` or `"system-chat.md"`
 * @param variables - Values merged into the template (also available as Handlebars `this` in partials)
 *
 * @example
 * template("system-chat", { todaysDate: new Date().toDateString(), todaysDateISO: new Date().toISOString() })
 */
function normalizePromptWhitespace(text: string): string {
    return text
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function template(name: string, variables: Record<string, unknown>): string {
    const path = resolveTemplateFilename(name);
    if (!existsSync(path)) {
        throw new Error(`Prompt template not found: ${path}`);
    }
    const source = readFileSync(path, "utf8");
    const render = Handlebars.compile(source, { noEscape: true, strict: false });
    return normalizePromptWhitespace(render(variables));
}
