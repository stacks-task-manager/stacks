// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: calendar events CRUD.
 */
import { z } from "zod";
import type { ICalendarEvent } from "@stacks/types";
import { EventsLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Calendar events (`EventsLoader`). */
export const eventAiTools = [
    defineTool({
        name: "listCalendarEvents",
        description: `Calendar events in a window (day/week/month) around an anchor date (defaults today).`,
        inputSchema: z.object({
            span: z.enum(["day", "week", "month"]).describe("Window size"),
            date: z.string().optional().describe("Anchor ISO yyyy-mm-dd; defaults today"),
        }),
        execute: async ({ span, date }) => {
            const events = (await EventsLoader.getAll({ span, date: date || undefined })) as ICalendarEvent[];
            return events.map(e => ({
                id: e.id,
                title: e.title ?? "",
                start: e.start ? new Date(e.start).toISOString() : null,
                end: e.end ? new Date(e.end).toISOString() : null,
                allDay: Boolean(e.allDay),
                location: e.location ?? "",
            }));
        },
    }),
];
