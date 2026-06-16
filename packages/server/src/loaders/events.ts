// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar events: local DB rows plus optional Google Calendar sync helpers.
 */
import { Op } from "sequelize";
import { endOfDay, startOfDay } from "date-fns";
import { Errors } from "../errors";
import { parseISO } from "date-fns";
import { PermissionEntity, EventEntity } from "@stacks/db";
import { findAll, findOne, sanitizeWhere } from "./utils";
import googleOAuthService, { type GoogleCalendarEvent } from "../services/googleOAuthService";

import { ICalendarEvent } from "@stacks/types";
import { getCurrentUser } from "./context";

EventEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(EventEntity, { foreignKey: "id", constraints: false });

interface EventsFilter {
    from: string;
    to: string;
    calendars?: string[];
}

interface Where {
    start?: {
        [Op.gte]: Date;
    };
    end?: {
        [Op.lte]: Date;
    };
}

/**
 * Convert Google Calendar events to local event format
 */
function convertGoogleEventsToLocalFormat(googleEvents: GoogleCalendarEvent[], calendarId: string): ICalendarEvent[] {
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
        };
    });
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

async function getAll(filters: EventsFilter) {
    try {
        const user = getCurrentUser();
        const calendars = filters.calendars;
        const includeLocal = calendars ? calendars.includes("local") : true;
        const googleCalendarIds = (calendars ?? [])
            .filter(c => typeof c === "string" && c.startsWith("google:"))
            .map(c => c.slice("google:".length))
            .filter(Boolean);

        const where: Where = {
            start: { [Op.gte]: parseISO(filters.from) },
            end: { [Op.lte]: parseISO(filters.to) }
        };

        const events: ICalendarEvent[] = [];
        if (includeLocal) {
            const localEvents = await findAll({
                entity: EventEntity,
                filter: where,
            });
            events.push(...(localEvents as unknown as ICalendarEvent[]));
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

async function create(data: Partial<Event>) {
    const user = getCurrentUser();
    try {
        const newEvent = await EventEntity.create({
            ...data,
            tenant: user.tenant,
            createdBy: user.id,
            updatedBy: user.id,
        });

        return newEvent.toJSON();
    } catch (error) {
        throw error;
    }
}

async function update(id: string, data: Partial<ICalendarEvent>) {
    try {
        await getOne(id);

        const [affectedCount] = await EventEntity.update(data, {
            where: sanitizeWhere({ id }),
        });

        return affectedCount > 0;
    } catch (error) {
        throw error;
    }
}

async function remove(id: string) {
    try {
        const user = getCurrentUser();
        const event = await getOne(id);

        await EventEntity.update(
            {
                deleted: new Date(),
                deletedBy: user.id,
            },
            { where: sanitizeWhere({ id }) }
        );
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
    remove,
};
