// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Merges domain tool definitions into the Vercel AI `ToolSet` for chat.
 */
import { tool } from "ai";
import type { ToolSet } from "ai";
import { activityAiTools } from "./activityTools";
import { eventAiTools } from "./eventTools";
import { navigationAiTools } from "./navigationTools";
import { notepadAiTools } from "./notepadTools";
import { orgAiTools } from "./orgTools";
import { peopleAiTools } from "./peopleTools";
import { projectAiTools } from "./projectTools";
import { reminderAiTools } from "./reminderTools";
import { searchAiTools } from "./searchTools";
import { stackAiTools } from "./stackTools";
import { taskAiTools } from "./taskTools";

export { defineTool } from "./defineTool";
export { activityAiTools } from "./activityTools";
export { eventAiTools } from "./eventTools";
export { navigationAiTools } from "./navigationTools";
export { notepadAiTools } from "./notepadTools";
export { orgAiTools } from "./orgTools";
export { peopleAiTools } from "./peopleTools";
export { projectAiTools } from "./projectTools";
export { reminderAiTools } from "./reminderTools";
export { searchAiTools } from "./searchTools";
export { stackAiTools } from "./stackTools";
export { taskAiTools } from "./taskTools";

/**
 * Composed registry; order is cosmetic. See each `*Tools.ts` file for loader mapping.
 */
export const AI_TOOL_REGISTRY = [
    ...projectAiTools,
    ...stackAiTools,
    ...taskAiTools,
    ...peopleAiTools,
    ...orgAiTools,
    ...searchAiTools,
    ...notepadAiTools,
    ...reminderAiTools,
    ...eventAiTools,
    ...activityAiTools,
    ...navigationAiTools,
];

/**
 * Build the `tools` object for `streamText` / `generateText` from {@link AI_TOOL_REGISTRY}.
 */
type BindAiTool = (opts: {
    description: string;
    inputSchema: unknown;
    execute: (input: never) => Promise<unknown>;
}) => unknown;

/**
 * Build the `tools` object for `streamText` / `generateText`.
 *
 * Pass `allowedNames` to restrict the set (used by the dynamic prompt selector
 * in `promptContext.ts`). Omit it to get every tool — suitable for tests and
 * any non-chat call site that wants the full surface.
 */
export function buildAiTools(allowedNames?: Iterable<string>): ToolSet {
    const out = {} as ToolSet;
    const bindTool = tool as unknown as BindAiTool;
    const allow = allowedNames ? new Set(allowedNames) : null;
    for (const def of AI_TOOL_REGISTRY) {
        if (allow && !allow.has(def.name)) {
            continue;
        }
        (out as Record<string, unknown>)[def.name] = bindTool({
            description: def.description,
            inputSchema: def.inputSchema,
            execute: def.execute as (input: never) => Promise<unknown>,
        });
    }
    return out;
}

export type AiTools = ReturnType<typeof buildAiTools>;
