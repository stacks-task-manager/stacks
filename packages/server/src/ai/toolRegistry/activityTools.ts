// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: task activity / comment operations.
 */
import { z } from "zod";
import { ActivitiesLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Task comments and activity feed (`ActivitiesLoader`). */
export const activityAiTools = [
    defineTool({
        name: "listActivities",
        description: `Read activity and comments for 1–20 resolved task ids, newest first. Returns an array with each entry's task reference, type, person, content, and creation date. This does not add comments.`,
        inputSchema: z.object({
            resourceIds: z.array(z.string()).min(1).max(20).describe("Task UUIDs (max 20)"),
        }),
        execute: async ({ resourceIds }) => {
            const activities = await ActivitiesLoader.getAllByResources(resourceIds);
            return activities.map(a => ({
                id: a.id,
                resourceId: a.resourceId,
                resourceType: a.resourceType,
                type: a.type,
                person: a.person,
                content: a.content,
                created: a.created,
            }));
        },
    }),
];
