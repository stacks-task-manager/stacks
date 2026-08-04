// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar events: local DB rows plus optional Google Calendar sync helpers.
 */
import { Op } from "sequelize";
import { addDays, endOfDay, format as formatDate, startOfDay } from "date-fns";
import { Errors } from "../errors";
import { parseISO } from "date-fns";
import { PermissionEntity, EventEntity } from "@stacks/db";
import { RRule } from "rrule";
import { findAll, findOne, sanitizeWhere } from "./utils";
import googleOAuthService, { type GoogleCalendarEvent } from "../services/googleOAuthService";
import { CalendarsLoader } from "./calendar";

import { ICalendarEvent, POLLINGACTIONS, POLLINGTYPE, type IPermissions } from "@stacks/types";
import { getCurrentUser } from "./context";
import { sendRealtimeUpdate } from "../events";

EventEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(EventEntity, { foreignKey: "id", constraints: false });

interface EventsFilter {
    from: string;
    to: string;
    calendars?: string[];
}

interface Where {
    [Op.and]?: unknown[];
    calendar?: {
        [Op.in]: string[];
    };
}

function defaultEventPermissions(userId: string): IPermissions {
    return {
        id: "",
        owner: userId,
        type: POLLINGTYPE.EVENT,
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
    };
}

async function sendEventRealtimeUpdate(record: string, action: POLLINGACTIONS, permissions?: IPermissions) {
    const user = getCurrentUser();
    await sendRealtimeUpdate({
        type: POLLINGTYPE.EVENT,
        record,
        action,
        permissions: permissions ?? defaultEventPermissions(user.id),
    });
}

function parseGoogleCompositeEventId(id: string): { calendarId: string; googleEventId: string } | null {
    if (!id.startsWith("google_")) return null;
    const rest = id.slice("google_".length);
    const lastUnderscore = rest.lastIndexOf("_");
    if (lastUnderscore <= 0) return null;
    const calendarId = rest.slice(0, lastUnderscore);
    const googleEventId = rest.slice(lastUnderscore + 1);
    if (!calendarId || !googleEventId) return null;
    return { calendarId, googleEventId };
}

function normalizeIsoDateTime(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    return undefined;
}

/**
 * Convert Google Calendar events to local event format
 */
function convertGoogleEventsToLocalFormat(
    googleEvents: GoogleCalendarEvent[],
    calendarId: string
): ICalendarEvent[] {
    const user = getCurrentUser();
    return googleEvents.map(googleEvent => {
        // Handle all-day events and timed events
        const startDate = googleEvent.start.dateTime
            ? new Date(googleEvent.start.dateTime)
            : new Date(googleEvent.start.date + "T00:00:00");

        const endDate = googleEvent.end.dateTime
            ? new Date(googleEvent.end.dateTime)
            : new Date(googleEvent.end.date + "T23:59:59");

        const isAllDay = !googleEvent.start.dateTime && !googleEvent.end.dateTime;

        return {
            id: `google_${calendarId}_${googleEvent.id}`,
            title: googleEvent.summary || "Untitled Event",
            description: googleEvent.description || "",
            start: startDate,
            end: endDate,
            allDay: isAllDay,
            assignees: [],
            source: "google" as const,
            calendar: calendarId,
            location: googleEvent.location || "",
            original: {
                htmlLink: googleEvent.htmlLink,
            },
            // externalId: googleEvent.id,
            // htmlLink: googleEvent.htmlLink,
            // status: googleEvent.status || 'confirmed',
            // creator: googleEvent.creator?.email,
            // organizer: googleEvent.organizer?.email,
            // attendees: googleEvent.attendees?.map(attendee => ({
            //     email: attendee.email,
            //     displayName: attendee.displayName,
            //     responseStatus: attendee.responseStatus
            // })) || [],
            // tenant: user.tenant,
            createdBy: user.id,
            updatedBy: user.id,
            created: googleEvent.created
                ? new Date(googleEvent.created).toISOString()
                : new Date().toISOString(),
            updated: googleEvent.updated
                ? new Date(googleEvent.updated).toISOString()
                : new Date().toISOString(),
            recurrenceRule: googleEvent.recurrence?.find(rule => rule.startsWith("RRULE:")) ?? null,
        };
    });
}

function convertGoogleEventToLocalFormat(
    googleEvent: GoogleCalendarEvent,
    calendarId: string
): ICalendarEvent {
    return convertGoogleEventsToLocalFormat([googleEvent], calendarId)[0];
}

function buildGoogleCalendarEventPayload(data: Partial<ICalendarEvent>) {
    const start = data.start instanceof Date ? data.start : data.start ? parseISO(String(data.start)) : null;
    const end = data.end instanceof Date ? data.end : data.end ? parseISO(String(data.end)) : null;

    if (!start || !end) {
        throw Errors.invalidInput("Start and end are required");
    }

    if (!data.title) {
        throw Errors.invalidInput("Title is required");
    }

    if (data.allDay) {
        return {
            summary: data.title,
            description: data.description || undefined,
            location: data.location || undefined,
            recurrence: data.recurrenceRule ? [data.recurrenceRule] : undefined,
            start: {
                date: formatDate(start, "yyyy-MM-dd"),
            },
            end: {
                date: formatDate(addDays(end, 1), "yyyy-MM-dd"),
            },
        };
    }

    return {
        summary: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        recurrence: data.recurrenceRule ? [data.recurrenceRule] : undefined,
        start: {
            dateTime: start.toISOString(),
        },
        end: {
            dateTime: end.toISOString(),
        },
    };
}

async function getOne(id: string) {
    try {
        const event = await findOne({
            entity: EventEntity,
            id,
        });

        if (!event) {
            throw Errors.notFound("Event not found");
        }

        return event;
    } catch (error) {
        throw error;
    }
}

function recurringEventIntersectsRange(event: ICalendarEvent, from: Date, to: Date): boolean {
    if (!event.recurrenceRule) return true;

    try {
        const durationMs = new Date(event.end).getTime() - new Date(event.start).getTime();
        const rangeStart = new Date(from.getTime() - Math.max(durationMs, 0));
        const rule = RRule.fromString(event.recurrenceRule.replace(/^RRULE:/, ""));
        const occurrences = new RRule({
            ...rule.origOptions,
            dtstart: new Date(event.start),
        }).between(rangeStart, to, true);
        const excludedDates = new Set(
            (event.recurrenceExDates ?? []).map(date => new Date(date).toISOString())
        );

        return occurrences.some(occurrence => {
            if (excludedDates.has(occurrence.toISOString())) return false;
            const occurrenceEnd = new Date(occurrence.getTime() + Math.max(durationMs, 0));
            return occurrence <= to && occurrenceEnd >= from;
        });
    } catch (error) {
        console.warn("Invalid recurrence rule on event:", event.id, error);
        return false;
    }
}

async function getAll(filters: EventsFilter) {
    try {
        const user = getCurrentUser();
        const calendars = filters.calendars;

        // Separate different calendar types
        const localCalendarIds = (calendars ?? [])
            .filter(
                c =>
                    typeof c === "string" &&
                    c.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            )
            .filter(Boolean);
        const includeLocal = calendars ? calendars.includes("local") : true;
        const googleCalendarIds = (calendars ?? [])
            .filter(c => typeof c === "string" && c.startsWith("google:"))
            .map(c => c.slice("google:".length))
            .filter(Boolean);

        const fromDate = parseISO(filters.from);
        const toDate = parseISO(filters.to);
        const where: Where = {
            [Op.and]: [
                {
                    [Op.or]: [
                        {
                            start: { [Op.lt]: toDate },
                            end: { [Op.gt]: fromDate },
                        },
                        {
                            recurrenceRule: { [Op.ne]: null },
                        },
                    ],
                },
            ],
        };

        const events: ICalendarEvent[] = [];
        if (includeLocal || localCalendarIds.length > 0) {
            if (localCalendarIds.length > 0) {
                where.calendar = { [Op.in]: localCalendarIds };
            }
            const localEvents = await findAll({
                entity: EventEntity,
                filter: where,
            });
            events.push(
                ...(localEvents as unknown as ICalendarEvent[]).filter(event =>
                    recurringEventIntersectsRange(event, fromDate, toDate)
                )
            );
        }

        if (googleCalendarIds.length > 0) {
            try {
                const hasGoogleTokens = await googleOAuthService.hasValidTokens(user.id);
                if (hasGoogleTokens) {
                    const timeMin = filters.from;
                    const timeMax = filters.to;

                    const results = await Promise.allSettled(
                        googleCalendarIds.map(async calendarId => {
                            const googleEvents = await googleOAuthService.getCalendarEvents(
                                user.id,
                                calendarId,
                                timeMin,
                                timeMax
                            );
                            return convertGoogleEventsToLocalFormat(googleEvents, calendarId);
                        })
                    );

                    for (const r of results) {
                        if (r.status === "fulfilled") {
                            events.push(...r.value);
                        } else {
                            console.warn("Failed to fetch Google Calendar events:", r.reason);
                        }
                    }
                }
            } catch (googleError) {
                console.warn("Failed to fetch Google Calendar events:", googleError);
            }
        }

        return events;
    } catch (error) {
        throw error;
    }
}

/**
 * Count events for a date range; defaults to today when no filters provided.
 */
async function countAll(filters?: { from?: string; to?: string }): Promise<number> {
    try {
        const fromDate = filters?.from ? parseISO(filters.from) : startOfDay(new Date());
        const toDate = filters?.to ? parseISO(filters.to) : endOfDay(new Date());

        const where = sanitizeWhere({
            start: { [Op.gte]: fromDate },
            end: { [Op.lte]: toDate },
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return EventEntity.count({ where } as any) as unknown as Promise<number>;
    } catch (error) {
        throw error;
    }
}

async function create(data: Partial<ICalendarEvent>) {
    const user = getCurrentUser();
    try {
        const source = data.source ?? "local";
        let calendar = data.calendar ?? (source === "local" ? "local" : undefined);

        if (source === "google") {
            if (!calendar) {
                throw Errors.invalidInput("Calendar is required for Google events");
            }

            try {
                const googleEvent = await googleOAuthService.createCalendarEvent(
                    user.id,
                    calendar,
                    buildGoogleCalendarEventPayload(data)
                );
                const event = convertGoogleEventToLocalFormat(googleEvent, calendar);
                await sendEventRealtimeUpdate(event.id, POLLINGACTIONS.CREATE);
                return event;
            } catch (error: any) {
                const status = error?.response?.status ?? error?.code;
                const message = typeof error?.message === "string" ? error.message : "";

                if (message.includes("No valid Google tokens found")) {
                    throw Errors.badRequest("Google account not connected");
                }
                if (status === 401) {
                    throw Errors.unauthorized("Google authorization expired");
                }
                if (status === 403) {
                    throw Errors.forbidden("Google Calendar access denied");
                }
                if (status === 400) {
                    throw Errors.badRequest("Invalid Google event");
                }

                throw Errors.internal("Failed to create Google event");
            }
        }

        if (source !== "local") {
            throw Errors.invalidInput("Unsupported calendar source");
        }

        // If calendar is "local" (legacy) or not specified, use the default calendar
        if (!calendar || calendar === "local") {
            const primaryCalendar = await CalendarsLoader.getPrimary();
            if (primaryCalendar) {
                calendar = primaryCalendar.id;
            } else {
                // Create a default calendar if none exists
                const newCalendar = await CalendarsLoader.create({
                    title: "Default Calendar",
                    color: "#FF8C00",
                    primary: true,
                });
                calendar = newCalendar.id;
            }
        }

        const newEvent = await EventEntity.create({
            ...data,
            source,
            calendar: calendar ?? "local",
            tenant: user.tenant,
            createdBy: user.id,
            updatedBy: user.id,
        });

        const event = newEvent.toJSON();
        await sendEventRealtimeUpdate(event.id, POLLINGACTIONS.CREATE);
        return event;
    } catch (error) {
        throw error;
    }
}

async function update(id: string, data: Partial<ICalendarEvent>) {
    try {
        if (id.startsWith("google_")) {
            const user = getCurrentUser();
            const parsed = parseGoogleCompositeEventId(id);
            if (!parsed) {
                throw Errors.invalidInput("Invalid Google event id");
            }

            const patch: {
                summary?: string;
                description?: string;
                location?: string;
                start?: { dateTime?: string; date?: string };
                end?: { dateTime?: string; date?: string };
                recurrence?: string[] | null;
            } = {};

            if (data.title != null) patch.summary = data.title;
            if (data.description != null) patch.description = data.description;
            if (data.location != null) patch.location = data.location;
            if (data.recurrenceRule !== undefined) {
                patch.recurrence = data.recurrenceRule ? [data.recurrenceRule] : null;
            }

            const start = normalizeIsoDateTime((data as any).start);
            const end = normalizeIsoDateTime((data as any).end);
            if (start) patch.start = { dateTime: start };
            if (end) patch.end = { dateTime: end };

            try {
                await googleOAuthService.updateCalendarEvent(
                    user.id,
                    parsed.calendarId,
                    parsed.googleEventId,
                    patch
                );
                await sendEventRealtimeUpdate(id, POLLINGACTIONS.UPDATE);
                return true;
            } catch (error: any) {
                const status = error?.response?.status ?? error?.code;
                const message = typeof error?.message === "string" ? error.message : "";
                const googleMessage =
                    error?.response?.data?.error?.message ??
                    error?.errors?.[0]?.message ??
                    (typeof error?.response?.data === "string" ? error.response.data : undefined);
                if (status === 404) {
                    return false;
                }
                if (message.includes("No valid Google tokens found")) {
                    throw Errors.badRequest("Google account not connected");
                }
                if (status === 401) {
                    throw Errors.unauthorized("Google authorization expired");
                }
                if (status === 403) {
                    throw Errors.forbidden("Google Calendar access denied");
                }
                if (status === 400) {
                    throw Errors.badRequest("Invalid Google event update", {
                        calendarId: parsed.calendarId,
                        eventId: parsed.googleEventId,
                        googleMessage,
                    });
                }
                throw Errors.internal("Failed to update Google event", {
                    calendarId: parsed.calendarId,
                    eventId: parsed.googleEventId,
                    status,
                });
            }
        }

        const event = await getOne(id);

        const [affectedCount] = await EventEntity.update(data, {
            where: sanitizeWhere({ id }),
        });

        if (affectedCount > 0) {
            await sendEventRealtimeUpdate(id, POLLINGACTIONS.UPDATE, (event as any).permissions);
        }

        return affectedCount > 0;
    } catch (error) {
        throw error;
    }
}

async function move(id: string, calendar: string, source: ICalendarEvent["source"]) {
    try {
        if (source === "local") {
            if (id.startsWith("google_")) {
                throw Errors.invalidInput("Cannot move Google events to local calendars");
            }

            const event = await getOne(id);
            const [affectedCount] = await EventEntity.update(
                { calendar },
                {
                    where: sanitizeWhere({ id, source: "local" }),
                }
            );
            if (affectedCount > 0) {
                await sendEventRealtimeUpdate(id, POLLINGACTIONS.UPDATE, (event as any).permissions);
            }
            return affectedCount > 0;
        }

        if (source === "google") {
            const user = getCurrentUser();
            const parsed = parseGoogleCompositeEventId(id);
            if (!parsed) {
                throw Errors.invalidInput("Invalid Google event id");
            }

            const calendars = await googleOAuthService.getCalendars(user.id);
            const destination = calendars.find(googleCalendar => googleCalendar.id === calendar);
            if (!destination) {
                throw Errors.invalidInput("Google calendar not found");
            }
            if (destination.accessRole === "reader" || destination.accessRole === "freeBusyReader") {
                throw Errors.forbidden("Google calendar is read-only");
            }

            await googleOAuthService.moveCalendarEvent(
                user.id,
                parsed.calendarId,
                parsed.googleEventId,
                calendar
            );
            await sendEventRealtimeUpdate(id, POLLINGACTIONS.UPDATE);
            return true;
        }

        throw Errors.invalidInput("Unsupported calendar source");
    } catch (error) {
        throw error;
    }
}

async function remove(id: string) {
    try {
        const user = getCurrentUser();
        if (id.startsWith("google_")) {
            const parsed = parseGoogleCompositeEventId(id);
            if (!parsed) {
                throw Errors.invalidInput("Invalid Google event id");
            }

            try {
                await googleOAuthService.deleteCalendarEvent(
                    user.id,
                    parsed.calendarId,
                    parsed.googleEventId
                );
                await sendEventRealtimeUpdate(id, POLLINGACTIONS.DELETED);
                return true;
            } catch (error: any) {
                const status = error?.response?.status ?? error?.code;
                const message = typeof error?.message === "string" ? error.message : "";

                if (message.includes("No valid Google tokens found")) {
                    throw Errors.badRequest("Google account not connected");
                }
                if (status === 401) {
                    throw Errors.unauthorized("Google authorization expired");
                }
                if (status === 403) {
                    throw Errors.forbidden("Google Calendar access denied");
                }
                if (status === 404) {
                    return false;
                }

                throw Errors.internal("Failed to delete Google event");
            }
        }

        const event = await getOne(id);

        await EventEntity.update(
            {
                deleted: new Date(),
                deletedBy: user.id,
            },
            { where: sanitizeWhere({ id }) }
        );
        await sendEventRealtimeUpdate(id, POLLINGACTIONS.DELETED, (event as any).permissions);
        return true;
    } catch (error) {
        throw error;
    }
}

export const EventsLoader = {
    getOne,
    getAll,
    countAll,
    create,
    update,
    move,
    remove,
};
