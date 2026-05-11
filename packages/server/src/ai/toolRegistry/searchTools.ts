// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: federated workspace search.
 */
import { z } from "zod";
import { SearchLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Cross-entity search (`SearchLoader`). */
export const searchAiTools = [
    defineTool({
        name: "globalSearch",
        description: `Cross-entity search (people, tasks, notepads). Use for vague names/phrases.`,
        inputSchema: z.object({
            query: z.string().min(1).describe("Search text"),
        }),
        execute: async ({ query }) => {
            const results = await SearchLoader.query(query);
            return results.map(r => ({
                id: r.id,
                type: r.type,
                title: r.title,
                parentId: r.parentId,
                parentTitle: r.parentTitle,
                parentType: r.parentType,
            }));
        },
    }),
];
