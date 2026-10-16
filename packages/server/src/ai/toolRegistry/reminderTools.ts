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
        description: `Read reminders attached to a task. Resolve a supplied task name with listTasks(searchQuery) now, then pass that task id as recordId. This tool cannot create reminders.`,
        inputSchema: z.object({
            recordId: z.string().describe("Task UUID whose reminders should be read"),
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
