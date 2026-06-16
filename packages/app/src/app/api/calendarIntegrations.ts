// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar provider integrations (Google today, others later).
 */
import request from "./request";

export type CalendarProvider = "google" | "microsoft";

export type RemoteCalendar = {
    id: string;
    title: string;
    color: string;
    source: CalendarProvider;
    primary: boolean;
    readOnly: boolean;
};

export type ProviderStatus = {
    isAuthenticated: boolean;
    provider: CalendarProvider;
};

export const CalendarIntegrationsAPI = {
    async getAuthUrl(provider: CalendarProvider): Promise<{ authUrl: string }> {
        return request.get(`/api/integrations/${provider}/auth-url`);
    },
    async getStatus(provider: CalendarProvider): Promise<ProviderStatus> {
        return request.get(`/api/integrations/${provider}/status`);
    },
    async disconnect(provider: CalendarProvider): Promise<{ disconnected: boolean }> {
        return request.delete(`/api/integrations/${provider}/disconnect`);
    },
    async listCalendars(provider: CalendarProvider): Promise<RemoteCalendar[]> {
        return request.get(`/api/integrations/${provider}/calendars`);
    },
};

