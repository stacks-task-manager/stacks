// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: calendar events CRUD.
 */
import { addDays, endOfMonth, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import { z } from "zod";
import type { ICalendarEvent } from "@stacks/types";
import { EventsLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Compute a { from, to } date range from a span + optional anchor date. */
function computeRange(span: "day" | "week" | "month", date?: string): { from: string; to: string } {
    const anchor = date ? parseISO(date) : startOfDay(new Date());
    switch (span) {
        case "day":
            return { from: anchor.toISOString(), to: anchor.toISOString() };
        case "week":
            return { from: subDays(anchor, 7).toISOString(), to: addDays(anchor, 7).toISOString() };
        case "month":
            return {
                from: startOfMonth(anchor).toISOString(),
                to: endOfMonth(anchor).toISOString(),
            };
    }
}

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
            const events = (await EventsLoader.getAll(computeRange(span, date))) as ICalendarEvent[];
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
