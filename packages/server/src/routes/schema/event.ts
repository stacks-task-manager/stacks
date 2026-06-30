// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar event payloads and list filters.
 */
import { z } from "zod/v4";

/** Partial update for an existing event. */
export const EventUpdateSchema = z
    .object({
        title: z.string().optional(),
        description: z.string().optional(),
        start: z.iso.datetime().optional(),
        end: z.iso.datetime().optional(),
        assignees: z.string().array().optional(),
    })
    .check(payload => {
        const value = payload.value;
        const hasStart = value.start != null;
        const hasEnd = value.end != null;

        if (hasStart !== hasEnd) {
            payload.issues.push({
                code: "custom",
                message: "Start and end must be provided together",
                path: hasStart ? ["end"] : ["start"],
                input: value,
            });
            return;
        }

        if (value.start != null && value.end != null) {
            if (Date.parse(value.end) <= Date.parse(value.start)) {
                payload.issues.push({
                    code: "custom",
                    message: "End must be after start",
                    path: ["end"],
                    input: value,
                });
            }
        }
    });

/** Full event body for creation. */
export const EventSchema = z
    .object({
        title: z.string(),
        description: z.string().optional(),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
        allDay: z.boolean().optional(),
        assignees: z.string().array().optional(),
        source: z.enum(["local", "google", "microsoft"]).optional(),
        calendar: z.string().optional(),
        location: z.string().optional(),
    })
    .check(payload => {
        const value = payload.value;
        if (Date.parse(value.end) <= Date.parse(value.start)) {
            payload.issues.push({
                code: "custom",
                message: "End must be after start",
                path: ["end"],
                input: value,
            });
        }

        if (value.source === "google" && !value.calendar) {
            payload.issues.push({
                code: "custom",
                message: "Calendar is required for Google events",
                path: ["calendar"],
                input: value,
            });
        }
    });

/** Query filters for listing events (span + anchor date). */
export const EventsFilteredSchema = z
    .object({
        from: z.iso.datetime(),
        to: z.iso.datetime(),
        calendars: z.preprocess(
            val => {
                if (val == null) return undefined;
                return typeof val === "string" ? [val] : val;
            },
            z
                .string()
                .regex(/^(local|google:.+|microsoft:.+)$/)
                .array()
                .optional()
        ),
    })
    .strict();

export const EventsCountSchema = z
    .object({
        from: z.iso.datetime().optional(),
        to: z.iso.datetime().optional(),
    })
    .strict();

export const EventDeleteSchema = z
    .object({
        scope: z.enum(["single", "series"]).optional(),
        calendarId: z.string().optional(),
        googleEventId: z.string().optional(),
        recurringEventId: z.string().optional(),
    })
    .strict()
    .check(payload => {
        const value = payload.value;
        const hasGoogleCalendar = value.calendarId != null;
        const hasGoogleEvent = value.googleEventId != null;
        const hasRecurringEvent = value.recurringEventId != null;

        if (!hasGoogleCalendar && !hasGoogleEvent && !hasRecurringEvent) {
            return;
        }

        if (!hasGoogleCalendar) {
            payload.issues.push({
                code: "custom",
                message: "calendarId is required for Google deletes",
                path: ["calendarId"],
                input: value,
            });
        }

        if (!hasGoogleEvent && !hasRecurringEvent) {
            payload.issues.push({
                code: "custom",
                message: "A Google event identifier is required",
                path: ["googleEventId"],
                input: value,
            });
        }

        if (value.scope === "series" && !hasRecurringEvent && !hasGoogleEvent) {
            payload.issues.push({
                code: "custom",
                message: "A recurring event identifier is required to delete a series",
                path: ["recurringEventId"],
                input: value,
            });
        }
    });
