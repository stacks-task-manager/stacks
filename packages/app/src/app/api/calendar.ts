// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local calendar API client.
 */
import request from "./request";

export interface LocalCalendar {
    id: string;
    title: string;
    color: string | null;
    isDefault: boolean;
    tenant: string;
    createdBy: string;
    updatedBy: string;
    created: string;
    updated: string;
    deleted: string | null;
    deletedBy: string | null;
}

export interface CreateCalendarPayload {
    title: string;
    color?: string;
    isDefault?: boolean;
}

export interface UpdateCalendarPayload {
    title?: string;
    color?: string;
    isDefault?: boolean;
}

export const CalendarsAPI = {
    /** List all local calendars for the current tenant. */
    async list(): Promise<LocalCalendar[]> {
        return request.get("/api/calendars");
    },

    /** Get a specific calendar by ID. */
    async get(id: string): Promise<LocalCalendar> {
        return request.get(`/api/calendars/${id}`);
    },

    /** Get the default calendar. */
    async getDefault(): Promise<LocalCalendar> {
        return request.get("/api/calendars/default");
    },

    /** Create a new local calendar. */
    async create(data: CreateCalendarPayload): Promise<LocalCalendar> {
        return request.post("/api/calendars", data);
    },

    /** Update a calendar. */
    async update(id: string, data: UpdateCalendarPayload): Promise<LocalCalendar> {
        return request.patch(`/api/calendars/${id}`, data);
    },

    /** Set a calendar as the default. */
    async setDefault(id: string): Promise<LocalCalendar> {
        return request.post(`/api/calendars/${id}/default`);
    },

    /** Delete a calendar. */
    async remove(id: string): Promise<{ success: boolean }> {
        return request.delete(`/api/calendars/${id}`);
    },
};