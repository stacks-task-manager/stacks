// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { z } from "zod";

/**
 * One AI tool row: Zod input + handler. Use in domain files like `projectTools.ts`, then spread into {@link AI_TOOL_REGISTRY}.
 */
export function defineTool<TSchema extends z.ZodType>(def: {
    name: string;
    description: string;
    inputSchema: TSchema;
    execute: (input: z.infer<TSchema>) => Promise<unknown>;
}) {
    return def;
}
