// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: calendar and calendar event CRUD.
 */
import { addDays, endOfDay, endOfMonth, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import { z } from "zod";
import type { ICalendar, ICalendarEvent } from "@stacks/types";
import { EventsLoader, CalendarsLoader } from "../../loaders";
import { getCurrentUser } from "../../loaders/context";
import { Errors } from "../../errors";
import googleOAuthService from "../../services/googleOAuthService";
import { defineTool } from "./defineTool";

const calendarSourceSchema = z.enum(["local", "google"]);
const eventPatchSourceSchema = z.enum(["local", "google", "microsoft"]);

const eventResponse = (event: ICalendarEvent) => ({
    id: event.id,
    title: event.title ?? "",
    description: event.description ?? "",
    start: event.start ? new Date(event.start).toISOString() : null,
    end: event.end ? new Date(event.end).toISOString() : null,
    allDay: Boolean(event.allDay),
    source: event.source,
    calendar: event.calendar,
    location: event.location ?? "",
    recurrenceRule: event.recurrenceRule ?? null,
    recurrenceExDates: event.recurrenceExDates ?? [],
});

function plainCalendar(calendar: unknown): ICalendar {
    if (calendar && typeof calendar === "object") {
        const value = calendar as {
            toJSON?: () => unknown;
            get?: (options?: { plain?: boolean }) => unknown;
        };
        if (typeof value.toJSON === "function") {
            return value.toJSON() as ICalendar;
        }
        if (typeof value.get === "function") {
            return value.get({ plain: true }) as ICalendar;
        }
    }
    return calendar as ICalendar;
}

const calendarResponse = (rawCalendar: unknown) => {
    const calendar = plainCalendar(rawCalendar);
    return {
        id: calendar.id,
        title: calendar.title || "(Untitled)",
        color: calendar.color ?? null,
        primary: calendar.primary === true,
        source: calendar.source,
        readOnly: calendar.readOnly === true,
    };
};

type CalendarToolRow = ReturnType<typeof calendarResponse>;

function calendarSummaryLine(calendar: CalendarToolRow): string {
    const title = `${calendar.title}${calendar.primary ? " (Default)" : ""}`;
    const color = calendar.color ? `, color ${calendar.color}` : "";
    const access = calendar.readOnly ? ", read-only" : "";
    return `- ${title} (${calendar.source}${color}${access})`;
}

export function listCalendarsToolResponse(calendars: unknown[]) {
    const rows = calendars.map(calendarResponse);
    const summary =
        rows.length > 0
            ? `Found ${rows.length} calendar${rows.length === 1 ? "" : "s"}:\n${rows
                  .map(calendarSummaryLine)
                  .join("\n")}`
            : "No calendars found.";

    return {
        count: rows.length,
        calendars: rows,
        summary,
    };
}

/** Compute a { from, to } date range from a span + optional anchor date. */
function computeRange(span: "day" | "week" | "month", date?: string): { from: string; to: string } {
    const anchor = date ? parseISO(date) : startOfDay(new Date());
    switch (span) {
        case "day":
            return { from: startOfDay(anchor).toISOString(), to: endOfDay(anchor).toISOString() };
        case "week":
            return { from: subDays(anchor, 7).toISOString(), to: addDays(anchor, 7).toISOString() };
        case "month":
            return {
                from: startOfMonth(anchor).toISOString(),
                to: endOfMonth(anchor).toISOString(),
            };
    }
}

async function getGoogleCalendars(): Promise<ICalendar[]> {
    const user = getCurrentUser();
    const calendars = await googleOAuthService.getCalendars(user.id);
    return calendars.map((calendar: any) => {
        const accessRole = typeof calendar.accessRole === "string" ? calendar.accessRole : "";
        const readOnly = accessRole !== "owner" && accessRole !== "writer";
        return {
            id: calendar.id,
            title: calendar.summary ?? "",
            color: calendar.backgroundColor ?? "#1976d2",
            source: "google",
            primary: calendar.primary === true,
            readOnly,
        };
    });
}

async function assertUniqueLocalCalendarTitle(title: string, excludeCalendarId?: string): Promise<void> {
    const normalized = title.trim().toLowerCase();
    const calendars = await CalendarsLoader.getAll();
    const duplicate = calendars.map(plainCalendar).some(calendar => {
        if (excludeCalendarId && calendar.id === excludeCalendarId) {
            return false;
        }
        return (calendar.title ?? "").trim().toLowerCase() === normalized;
    });

    if (duplicate) {
        throw Errors.badRequest("A calendar with this name already exists");
    }
}

async function assertWritableGoogleCalendar(calendarId: string): Promise<void> {
    const calendars = await getGoogleCalendars();
    const calendar = calendars.find(candidate => candidate.id === calendarId);
    if (!calendar) {
        throw Errors.badRequest("Google calendar not found");
    }
    if (calendar.readOnly) {
        throw Errors.forbidden("Google calendar is read-only");
    }
}

const eventCreateSchema = z.object({
    title: z.string().min(1).describe("Event title"),
    description: z.string().optional().describe("Event description"),
    start: z.string().describe("Event start ISO 8601 date-time"),
    end: z.string().describe("Event end ISO 8601 date-time"),
    allDay: z.boolean().optional().describe("True for an all-day event"),
    source: calendarSourceSchema.optional().describe("Calendar source; defaults to local"),
    calendar: z
        .string()
        .optional()
        .describe("Calendar id. Required for Google events; optional for local events to use the default."),
    location: z.string().optional().describe("Event location"),
    recurrenceRule: z
        .string()
        .regex(/^RRULE:/i)
        .nullable()
        .optional()
        .describe("Optional canonical recurrence rule, e.g. RRULE:FREQ=WEEKLY;COUNT=4"),
});

const eventUpdateSchema = z.object({
    eventId: z.string().describe("Event UUID, or google_<calendarId>_<eventId> for Google events"),
    title: z.string().min(1).optional(),
    description: z.string().optional().describe("Event description; pass empty string to clear"),
    start: z.string().optional().describe("Event start ISO 8601 date-time"),
    end: z.string().optional().describe("Event end ISO 8601 date-time"),
    allDay: z.boolean().optional(),
    location: z.string().optional().describe("Event location; pass empty string to clear"),
    recurrenceRule: z
        .string()
        .regex(/^RRULE:/i)
        .nullable()
        .optional()
        .describe("Canonical recurrence rule, or null to remove recurrence"),
    recurrenceExDates: z
        .array(z.string())
        .optional()
        .describe("Excluded occurrence ISO dates for local events"),
});

/** Calendar and calendar event AI tools. */
export const eventAiTools = [
    defineTool({
        name: "listCalendars",
        description: `List local calendars and, when connected, Google calendars. Use this before creating or moving events when you need a calendar id or writable target.`,
        inputSchema: z.object({
            source: calendarSourceSchema.optional().describe("Optional source filter"),
            includeReadOnly: z.boolean().optional().describe("Include read-only calendars; defaults true"),
        }),
        execute: async ({ source, includeReadOnly }) => {
            const calendars: ICalendar[] = [];
            if (!source || source === "local") {
                calendars.push(
                    ...(await CalendarsLoader.getAll()).map(calendar => {
                        const localCalendar = plainCalendar(calendar);
                        return {
                            ...localCalendar,
                            source: "local" as const,
                            readOnly: false,
                        };
                    })
                );
            }

            if (!source || source === "google") {
                try {
                    calendars.push(...(await getGoogleCalendars()));
                } catch {
                    // Google is optional. Keep local calendar management usable when not connected.
                }
            }

            return listCalendarsToolResponse(
                calendars.filter(calendar => includeReadOnly !== false || !calendar.readOnly)
            );
        },
    }),

    defineTool({
        name: "createLocalCalendar",
        description: `Create a local calendar. Use only for local calendars; Google calendar creation is not supported by this app.`,
        inputSchema: z.object({
            title: z.string().min(1).describe("Calendar name"),
            color: z.string().optional().describe("Calendar color, usually a hex value"),
            primary: z.boolean().optional().describe("Set as the default local calendar"),
        }),
        execute: async ({ title, color, primary }) => {
            const trimmedTitle = title.trim();
            await assertUniqueLocalCalendarTitle(trimmedTitle);
            const calendar = await CalendarsLoader.create({
                title: trimmedTitle,
                color,
                primary: primary ?? false,
            });
            return calendarResponse(calendar as unknown as ICalendar);
        },
    }),

    defineTool({
        name: "updateLocalCalendar",
        description: `Update a local calendar's title, color, or default status. Use listCalendars first if you only know the name.`,
        inputSchema: z.object({
            calendarId: z.string().uuid().describe("Local calendar UUID"),
            title: z.string().min(1).optional(),
            color: z.string().optional(),
            primary: z.boolean().optional().describe("Set as the default local calendar"),
        }),
        execute: async ({ calendarId, title, color, primary }) => {
            const patch: { title?: string; color?: string; primary?: boolean } = {};
            if (title !== undefined) {
                const trimmedTitle = title.trim();
                await assertUniqueLocalCalendarTitle(trimmedTitle, calendarId);
                patch.title = trimmedTitle;
            }
            if (color !== undefined) {
                patch.color = color;
            }
            if (primary !== undefined) {
                patch.primary = primary;
            }
            const calendar = await CalendarsLoader.update(calendarId, patch);
            return calendarResponse(calendar as unknown as ICalendar);
        },
    }),

    defineTool({
        name: "deleteLocalCalendar",
        description: `Delete a local calendar by id. This does not delete Google calendars.`,
        inputSchema: z.object({
            calendarId: z.string().uuid().describe("Local calendar UUID"),
        }),
        execute: async ({ calendarId }) => {
            const deleted = await CalendarsLoader.remove(calendarId);
            return { id: calendarId, deleted };
        },
    }),

    defineTool({
        name: "listCalendarEvents",
        description: `Calendar events in a window (day/week/month) around an anchor date (defaults today).`,
        inputSchema: z.object({
            span: z.enum(["day", "week", "month"]).describe("Window size"),
            date: z.string().optional().describe("Anchor ISO yyyy-mm-dd; defaults today"),
        }),
        execute: async ({ span, date }) => {
            const events = (await EventsLoader.getAll(computeRange(span, date))) as ICalendarEvent[];
            return events.map(eventResponse);
        },
    }),

    defineTool({
        name: "getCalendarEvent",
        description: `Load one local calendar event by id. Google event details are returned by listCalendarEvents; do not call this for google_* ids.`,
        inputSchema: z.object({
            eventId: z.string().describe("Event UUID, or google_<calendarId>_<eventId> for Google events"),
        }),
        execute: async ({ eventId }) => {
            const event = (await EventsLoader.getOne(eventId)) as ICalendarEvent;
            return eventResponse(event);
        },
    }),

    defineTool({
        name: "createCalendarEvent",
        description: `Create a local or Google calendar event. For Google, call listCalendars first and choose a writable Google calendar id. Recurrence applies to the whole series.`,
        inputSchema: eventCreateSchema,
        execute: async input => {
            const source = input.source ?? "local";
            if (source === "google") {
                if (!input.calendar) {
                    throw Errors.badRequest("Calendar is required for Google events");
                }
                await assertWritableGoogleCalendar(input.calendar);
            }

            const event = (await EventsLoader.create({
                title: input.title,
                description: input.description ?? "",
                start: new Date(input.start),
                end: new Date(input.end),
                allDay: input.allDay ?? false,
                source,
                calendar: input.calendar,
                location: input.location,
                recurrenceRule: input.recurrenceRule ?? null,
                recurrenceExDates: [],
            })) as ICalendarEvent;
            return eventResponse(event);
        },
    }),

    defineTool({
        name: "updateCalendarEvent",
        description: `Update an event's fields. Recurring event edits apply to the whole series; individual occurrence edits are not supported.`,
        inputSchema: eventUpdateSchema,
        execute: async ({
            eventId,
            title,
            description,
            start,
            end,
            allDay,
            location,
            recurrenceRule,
            recurrenceExDates,
        }) => {
            const patch: Partial<ICalendarEvent> = {};
            if (title !== undefined) {
                patch.title = title;
            }
            if (description !== undefined) {
                patch.description = description;
            }
            if (start !== undefined) {
                patch.start = new Date(start);
            }
            if (end !== undefined) {
                patch.end = new Date(end);
            }
            if (allDay !== undefined) {
                patch.allDay = allDay;
            }
            if (location !== undefined) {
                patch.location = location;
            }
            if (recurrenceRule !== undefined) {
                patch.recurrenceRule = recurrenceRule;
                patch.recurrenceExDates = [];
            }
            if (recurrenceExDates !== undefined) {
                patch.recurrenceExDates = recurrenceExDates;
            }

            const updated = await EventsLoader.update(eventId, patch);
            return { id: eventId, updated };
        },
    }),

    defineTool({
        name: "moveCalendarEvent",
        description: `Move an event to another calendar within the same source. Local events can only move to local calendars; Google events can only move to writable Google calendars.`,
        inputSchema: z.object({
            eventId: z.string().describe("Event UUID, or google_<calendarId>_<eventId> for Google events"),
            source: eventPatchSourceSchema.describe("Source of the existing event"),
            calendarId: z.string().describe("Destination calendar id"),
        }),
        execute: async ({ eventId, source, calendarId }) => {
            if (source === "google") {
                await assertWritableGoogleCalendar(calendarId);
            } else if (source === "local") {
                await CalendarsLoader.getOne(calendarId);
            }

            const moved = await EventsLoader.move(eventId, calendarId, source);
            return { id: eventId, calendar: calendarId, source, moved };
        },
    }),

    defineTool({
        name: "deleteCalendarEvent",
        description: `Delete a calendar event by id. For recurring events, this removes all occurrences in the series.`,
        inputSchema: z.object({
            eventId: z.string().describe("Event UUID, or google_<calendarId>_<eventId> for Google events"),
        }),
        execute: async ({ eventId }) => {
            const deleted = await EventsLoader.remove(eventId);
            return { id: eventId, deleted };
        },
    }),
];
