// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: notepad read/update.
 */
import { z } from "zod";
import { NotepadsLoader } from "../../loaders";
import { defineTool } from "./defineTool";

const CONTENT_PREVIEW = 400;
const SUMMARIZE_MAX_CHARS = 80_000;

/** Notepad tools (`NotepadsLoader`). */
export const notepadAiTools = [
    defineTool({
        name: "listNotepads",
        description: `Read notepad matches with ids, titles, document ids, and content previews capped at 400 characters. Optional query searches content. Previews are incomplete; use summarizeNotepad for text needed for a summary.`,
        inputSchema: z.object({
            query: z.string().optional().describe("Content substring"),
        }),
        execute: async ({ query }) => {
            const notepads = await NotepadsLoader.getAll({ query: query?.trim() || undefined });
            return notepads.map(n => {
                const text = (n.content || "").replace(/\s+/g, " ").trim();
                return {
                    id: n.id,
                    title: n.document?.title ?? "",
                    documentId: n.document?.id ?? null,
                    contentPreview:
                        text.length > CONTENT_PREVIEW ? `${text.slice(0, CONTENT_PREVIEW)}…` : text,
                };
            });
        },
    }),

    defineTool({
        name: "summarizeNotepad",
        description: `Read a resolved notepad's text for summarization. Returns content, title, original contentLength, and contentTruncated; content is capped at 80,000 characters. Summarize returned facts and action items, noting omitted content when truncated. Does not edit the notepad.`,
        inputSchema: z.object({
            notepadId: z.string().describe("Notepad UUID"),
        }),
        execute: async ({ notepadId }) => {
            const n = await NotepadsLoader.getOne(notepadId);
            const title = n.document?.title ?? "";
            const raw = (n.content || "").trim();
            const truncated = raw.length > SUMMARIZE_MAX_CHARS;
            const content = truncated ? raw.slice(0, SUMMARIZE_MAX_CHARS) : raw;
            return {
                id: n.id,
                title,
                documentId: n.document?.id ?? null,
                content,
                contentTruncated: truncated,
                contentLength: raw.length,
            };
        },
    }),
];
