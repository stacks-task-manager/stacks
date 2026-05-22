// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar events, counts, and Google OAuth URL helper.
 */
import { ICalendarEvent, ITask, ITimeLog } from "@stacks/types";
import request from "./request";

interface LoadTasks {
    tasks: ITask[];
    timelogs: ITimeLog[];
}

interface LoadTasksParams {
    showTimelogs: boolean;
    showCompleted: boolean;
    projects: string[];
}

/** Maps agenda view to backend `span` query. */
function viewConverter(view: string) {
    return view === "agenda" ? "month" : view;
}

export const EventsAPI = {
    /** Lists events for a calendar view and anchor date. */
    async loadEvents(view: string, date: Date): Promise<ICalendarEvent[]> {
        console.log("Loading events");

        const span = viewConverter(view);
        return request.get("/api/events", {
            params: {
                span,
                date: date.toISOString(),
            },
        });
    },
    /** Creates an event. */
    async add(event: Partial<ICalendarEvent>): Promise<ICalendarEvent> {
        return request.post("/api/events", event);
    },
    /** PATCH an event. */
    async update(eventId: string, event: Partial<ICalendarEvent>): Promise<boolean> {
        return request.patch(`/api/events/${eventId}`, event);
    },
    /** Deletes an event. */
    async remove(eventId: string): Promise<boolean> {
        return request.delete(`/api/events/${eventId}`);
    },
    /** Event count for today. */
    async getTodaysEvents(): Promise<number> {
        return request.get("/api/events/count");
    },
    /** Tasks due today count. */
    async getTodaysDueDate(): Promise<number> {
        return request.get("/api/tasks/count", {
            params: {
                span: "day",
                duedate: new Date().toISOString(),
            },
        });
    },
    /** Calendar workload: tasks (+ timelogs when enabled server-side). */
    async loadTasks(view: string, date: Date, params: LoadTasksParams): Promise<LoadTasks> {
        const span = viewConverter(view);
        return request.get("/api/events/tasks", {
            params: {
                span,
                date: date.toISOString(),
            },
        });
    },
    /** Starts Google OAuth popup flow. */
    async loginGoogle(): Promise<{ authUrl: string }> {
        return request.get("/api/google/auth-url");
    },
};
