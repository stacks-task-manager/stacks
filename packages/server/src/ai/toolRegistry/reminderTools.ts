// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: task reminders.
 */
import { z } from "zod";
import { RemindersLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Reminders attached to a record (`RemindersLoader`). */
export const reminderAiTools = [
    defineTool({
        name: "listReminders",
        description: `List reminders on a record (usually a task).`,
        inputSchema: z.object({
            recordId: z.string().describe("Record UUID"),
        }),
        execute: async ({ recordId }) => {
            const reminders = await RemindersLoader.getAll(recordId);
            return reminders.map(r => ({
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                date: r.date ? new Date(r.date).toISOString() : null,
                recordId: r.recordId,
                recordType: r.recordType,
                url: r.url,
            }));
        },
    }),
];
