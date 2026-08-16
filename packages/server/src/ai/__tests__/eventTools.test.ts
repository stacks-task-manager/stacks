// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { eventAiTools, listCalendarsToolResponse } from "../toolRegistry/eventTools";

describe("ai.eventTools input schemas", () => {
    const createCalendarEvent = eventAiTools.find(tool => tool.name === "createCalendarEvent");
    const updateCalendarEvent = eventAiTools.find(tool => tool.name === "updateCalendarEvent");
    const moveCalendarEvent = eventAiTools.find(tool => tool.name === "moveCalendarEvent");

    it("accepts recurring event creation payloads", () => {
        const result = createCalendarEvent?.inputSchema.safeParse({
            title: "Weekly planning",
            start: "2026-08-10T09:00:00.000Z",
            end: "2026-08-10T10:00:00.000Z",
            source: "local",
            recurrenceRule: "RRULE:FREQ=WEEKLY;COUNT=4",
        });

        expect(result?.success).toBe(true);
    });

    it("accepts null recurrenceRule when updating to remove recurrence", () => {
        const result = updateCalendarEvent?.inputSchema.safeParse({
            eventId: "event-1",
            recurrenceRule: null,
        });

        expect(result?.success).toBe(true);
    });

    it("accepts source-safe move payloads", () => {
        const result = moveCalendarEvent?.inputSchema.safeParse({
            eventId: "event-1",
            source: "local",
            calendarId: "550e8400-e29b-41d4-a716-446655440000",
        });

        expect(result?.success).toBe(true);
    });

    it("returns calendar titles and colors in listCalendars summary", () => {
        const result = listCalendarsToolResponse([
            {
                id: "calendar-1",
                title: "Work",
                color: "#0f766e",
                primary: true,
                source: "local",
                readOnly: false,
            },
            {
                id: "calendar-2",
                title: "Personal",
                color: "#2563eb",
                primary: false,
                source: "google",
                readOnly: true,
            },
        ]);

        expect(result.count).toBe(2);
        expect(result.calendars).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ title: "Work", color: "#0f766e" }),
                expect.objectContaining({ title: "Personal", color: "#2563eb" }),
            ])
        );
        expect(result.summary).toContain("Work (Default)");
        expect(result.summary).toContain("#0f766e");
        expect(result.summary).toContain("Personal");
        expect(result.summary).toContain("#2563eb");
    });

    it("returns calendar titles and colors from Sequelize-style rows", () => {
        const result = listCalendarsToolResponse([
            {
                toJSON: () => ({
                    id: "calendar-1",
                    title: "Client Calls",
                    color: "#dc2626",
                    primary: false,
                    source: "local",
                    readOnly: false,
                }),
            },
        ]);

        expect(result.calendars[0]).toEqual(
            expect.objectContaining({
                title: "Client Calls",
                color: "#dc2626",
            })
        );
        expect(result.summary).toContain("Client Calls");
        expect(result.summary).toContain("#dc2626");
        expect(result.summary).not.toContain("(Untitled)");
    });
});
