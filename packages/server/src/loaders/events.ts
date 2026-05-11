// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar events: local DB rows plus optional Google Calendar sync helpers.
 */
import { Op } from "sequelize";
import { Errors } from "../errors";
import { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { PermissionEntity, EventEntity } from "@stacks/db";
import { findAll, findOne, sanitizeWhere } from "./utils";
import googleOAuthService, { type GoogleCalendarEvent } from "../services/googleOAuthService";

import { ICalendarEvent } from "@stacks/types";
import { getCurrentUser } from "./context";

EventEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(EventEntity, { foreignKey: "id", constraints: false });

interface EventsFilter {
    span?: "day" | "week" | "month";
    date?: string;
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
function convertGoogleEventsToLocalFormat(googleEvents: GoogleCalendarEvent[]): ICalendarEvent[] {
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
            id: `google_${googleEvent.id}`,
            title: googleEvent.summary || "Untitled Event",
            description: googleEvent.description || "",
            start: startDate,
            end: endDate,
            allDay: isAllDay,
            assignees: [],
            source: "google" as const,
            calendar: "primary", // Default calendar for Google events
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
        const where: Where = {};
        let timeMin: string | undefined;
        let timeMax: string | undefined;

        if (filters.span) {
            const date = filters.date != null ? parseISO(filters.date) : new Date();
            if (filters.span === "day") {
                const startDate = startOfDay(date);
                const endDate = endOfDay(date);
                where.start = { [Op.gte]: startDate };
                where.end = { [Op.lte]: endDate };
                timeMin = startDate.toISOString();
                timeMax = endDate.toISOString();
            } else if (filters.span === "week") {
                const startDate = startOfWeek(date);
                const endDate = endOfWeek(date);
                where.start = { [Op.gte]: startDate };
                where.end = { [Op.lte]: endDate };
                timeMin = startDate.toISOString();
                timeMax = endDate.toISOString();
            } else if (filters.span === "month") {
                const startDate = startOfMonth(date);
                const endDate = endOfMonth(date);
                where.start = { [Op.gte]: startDate };
                where.end = { [Op.lte]: endDate };
                timeMin = startDate.toISOString();
                timeMax = endDate.toISOString();
            }
        }

        // Get local events
        const events = await findAll({
            entity: EventEntity,
            filter: where,
        });

        // Try to get Google Calendar events if user has valid tokens
        // try {
        //     const hasGoogleTokens = await googleOAuthService.hasValidTokens(user.id);
        //     if (hasGoogleTokens) {
        //         const googleEvents = await googleOAuthService.getCalendarEvents(user.id, timeMin, timeMax);
        //         const convertedGoogleEvents = convertGoogleEventsToLocalFormat(googleEvents, user);
        //         events.push(...convertedGoogleEvents);
        //     }
        // } catch (googleError) {
        //     console.warn('Failed to fetch Google Calendar events:', googleError);
        //     // Continue with local events only
        // }

        return events;
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
    create,
    update,
    remove,
};
