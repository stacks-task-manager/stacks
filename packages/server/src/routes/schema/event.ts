// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar event payloads and list filters.
 */
import { z } from "zod/v4";

const RecurrenceRuleSchema = z
    .string()
    .regex(/^RRULE:/, "Recurrence rule must use RRULE: format")
    .optional()
    .nullable();

/** Partial update for an existing event. */
export const EventUpdateSchema = z
    .object({
        title: z.string().optional(),
        description: z.string().optional().nullable(),
        start: z.iso.datetime().optional(),
        end: z.iso.datetime().optional(),
        allDay: z.boolean().optional(),
        assignees: z.string().array().optional(),
        calendar: z.string().optional(),
        location: z.string().optional().nullable(),
        recurrenceRule: RecurrenceRuleSchema,
        recurrenceExDates: z.iso.datetime().array().optional().nullable(),
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
        description: z.string().optional().nullable(),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
        allDay: z.boolean().optional(),
        assignees: z.string().array().optional(),
        source: z.enum(["local", "google", "microsoft"]).optional(),
        calendar: z.string().optional(),
        location: z.string().optional().nullable(),
        recurrenceRule: RecurrenceRuleSchema,
        recurrenceExDates: z.iso.datetime().array().optional().nullable(),
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
                .regex(
                    /^(local|google:.+|microsoft:.+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
                )
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
        calendarId: z.string().min(1).optional(),
        googleEventId: z.string().min(1).optional(),
        recurringEventId: z.string().min(1).optional(),
    })
    .strict()
    .check(payload => {
        const value = payload.value;
        const hasGoogleCalendar = value.calendarId !== undefined;
        const hasGoogleEvent = value.googleEventId !== undefined;
        const hasRecurringEvent = value.recurringEventId !== undefined;
        const hasGoogleDeleteMetadata =
            value.scope !== undefined || hasGoogleCalendar || hasGoogleEvent || hasRecurringEvent;

        if (!hasGoogleDeleteMetadata) {
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

        if (!hasGoogleEvent) {
            payload.issues.push({
                code: "custom",
                message: "googleEventId is required for Google deletes",
                path: ["googleEventId"],
                input: value,
            });
        }

        if (value.scope === "series" && !hasRecurringEvent) {
            payload.issues.push({
                code: "custom",
                message: "A recurring event identifier is required to delete a series",
                path: ["recurringEventId"],
                input: value,
            });
        }
    });

export const EventMoveSchema = z
    .object({
        calendar: z.string().min(1),
        source: z.enum(["local", "google", "microsoft"]),
    })
    .strict();
