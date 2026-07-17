// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local calendar API client.
 */
import { ICalendar } from "@stacks/types";
import request from "./request";


export const CalendarsAPI = {
    /** List all local calendars for the current tenant. */
    async list(): Promise<ICalendar[]> {
        return request.get("/api/calendars");
    },

    /** Create a new local calendar. */
    async create(data: Pick<ICalendar, "title" | "color" | "primary">): Promise<ICalendar> {
        return request.post("/api/calendars", data);
    },

    /** Update a calendar. */
    async update(id: string, data: Partial<Pick<ICalendar, "title" | "color" | "primary">>): Promise<ICalendar> {
        return request.patch(`/api/calendars/${id}`, data);
    },

    /** Delete a calendar. */
    async remove(id: string): Promise<{ success: boolean }> {
        return request.delete(`/api/calendars/${id}`);
    },
};