// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { sequelize, UserEntity } from "@stacks/db";
import { google } from "googleapis";
import { CodeChallengeMethod } from "google-auth-library";

interface GoogleOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

interface GoogleTokens {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
}

interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    location?: string;
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
    }>;
    creator?: {
        email: string;
        displayName?: string;
    };
    organizer?: {
        email: string;
        displayName?: string;
    };
    status?: string;
    htmlLink?: string;
    created?: string;
    updated?: string;
    recurringEventId?: string;
    originalStartTime?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    recurrence?: string[];
}

class GoogleOAuthService {
    private config: GoogleOAuthConfig;

    /**
     * A provider client per operation. The googleapis client remembers the
     * credentials it was last given, so one shared instance would let a call for
     * one user run with another user's tokens.
     */
    private client(): any {
        return new google.auth.OAuth2(
            this.config.clientId,
            this.config.clientSecret,
            this.config.redirectUri
        );
    }

    private mapGoogleEvent(event: any): GoogleCalendarEvent {
        return {
            id: event.id!,
            summary: event.summary || "",
            description: event.description,
            start: {
                dateTime: event.start?.dateTime,
                date: event.start?.date,
                timeZone: event.start?.timeZone,
            },
            end: {
                dateTime: event.end?.dateTime,
                date: event.end?.date,
                timeZone: event.end?.timeZone,
            },
            location: event.location,
            attendees: event.attendees?.map((attendee: any) => ({
                email: attendee.email || "",
                displayName: attendee.displayName,
                responseStatus: attendee.responseStatus,
            })),
            creator: event.creator
                ? {
                      email: event.creator.email || "",
                      displayName: event.creator.displayName,
                  }
                : undefined,
            organizer: event.organizer
                ? {
                      email: event.organizer.email || "",
                      displayName: event.organizer.displayName,
                  }
                : undefined,
            status: event.status,
            htmlLink: event.htmlLink,
            created: event.created,
            updated: event.updated,
            recurringEventId: event.recurringEventId,
            originalStartTime: event.originalStartTime
                ? {
                      dateTime: event.originalStartTime.dateTime,
                      date: event.originalStartTime.date,
                      timeZone: event.originalStartTime.timeZone,
                  }
                : undefined,
            recurrence: event.recurrence,
        };
    }

    constructor() {
        const appOrigin = process.env.APP_ORIGIN?.trim() || "http://localhost:3000";
        this.config = {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirectUri: process.env.GOOGLE_REDIRECT_URI || `${appOrigin}/api/google/callback`,
        };
    }

    /**
     * Generate Google OAuth authorization URL
     */
    getAuthUrl(state: string, codeChallenge: string): string {
        const scopes = [
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ];

        return this.client().generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            prompt: "consent",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: CodeChallengeMethod.S256,
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokens(code: string, codeVerifier: string): Promise<GoogleTokens> {
        try {
            const { tokens } = await this.client().getToken({ code, codeVerifier });
            return {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date,
            };
        } catch {
            console.error("Google OAuth token exchange failed");
            throw new Error("Failed to exchange authorization code for tokens");
        }
    }

    /**
     * Store Google tokens for a user
     */
    async storeTokens(userId: string, tokens: GoogleTokens): Promise<void> {
        try {
            await sequelize.transaction(async transaction => {
                const user = await UserEntity.findByPk(userId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!user) {
                    throw new Error("User not found");
                }

                const currentTokens = (user.get("oauthTokens") as any) || {};
                const updatedTokens = {
                    ...currentTokens,
                    google: tokens,
                };

                await user.update({ oauthTokens: updatedTokens }, { transaction });
            });
        } catch {
            console.error("Google OAuth token storage failed");
            throw new Error("Failed to store Google tokens");
        }
    }

    /**
     * Get stored Google tokens for a user
     */
    async getStoredTokens(userId: string): Promise<GoogleTokens | null> {
        try {
            const user = await UserEntity.findByPk(userId);
            if (!user) {
                return null;
            }

            const oauthTokens = user.get("oauthTokens") as any;
            return oauthTokens?.google || null;
        } catch {
            console.error("Google OAuth stored-token lookup failed");
            return null;
        }
    }

    /**
     * Refresh access token if needed
     */
    async refreshTokenIfNeeded(userId: string): Promise<GoogleTokens | null> {
        try {
            const tokens = await this.getStoredTokens(userId);
            if (!tokens) {
                return null;
            }

            // Check if token is expired (with 5 minute buffer)
            const now = Date.now();
            const expiryTime = tokens.expiry_date;
            const bufferTime = 5 * 60 * 1000; // 5 minutes

            if (now < expiryTime - bufferTime) {
                return tokens; // Token is still valid
            }

            // Token needs refresh
            const client = this.client();
            client.setCredentials({
                refresh_token: tokens.refresh_token,
            });

            const { credentials } = await client.refreshAccessToken();
            const refreshedTokens: GoogleTokens = {
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token || tokens.refresh_token,
                scope: credentials.scope || tokens.scope,
                token_type: credentials.token_type || tokens.token_type,
                expiry_date: credentials.expiry_date || Date.now() + 3600000,
            };

            const stored = await this.storeRefreshedTokens(userId, tokens, refreshedTokens);
            if (!stored) return null;
            return refreshedTokens;
        } catch {
            console.error("Google OAuth token refresh failed");
            return null;
        }
    }

    /**
     * Persist a refresh only while the account still has the credentials that
     * initiated it. The row lock serializes this check with disconnect so a
     * late provider response cannot reconnect an account the user removed.
     */
    private async storeRefreshedTokens(
        userId: string,
        expectedTokens: GoogleTokens,
        refreshedTokens: GoogleTokens
    ): Promise<boolean> {
        return sequelize.transaction(async transaction => {
            const user = await UserEntity.findByPk(userId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!user) return false;

            const currentTokens = (user.get("oauthTokens") as any) || {};
            const currentGoogleTokens = currentTokens.google as GoogleTokens | undefined;
            if (
                !currentGoogleTokens ||
                currentGoogleTokens.access_token !== expectedTokens.access_token ||
                currentGoogleTokens.refresh_token !== expectedTokens.refresh_token
            ) {
                return false;
            }

            await user.update(
                { oauthTokens: { ...currentTokens, google: refreshedTokens } },
                { transaction }
            );
            return true;
        });
    }

    /**
     * Get Google Calendar events for a user
     */
    async getCalendarEvents(
        userId: string,
        calendarId: string = "primary",
        timeMin?: string,
        timeMax?: string
    ): Promise<GoogleCalendarEvent[]> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });

            const response = await calendar.events.list({
                calendarId,
                timeMin: timeMin || new Date().toISOString(),
                timeMax: timeMax,
                maxResults: 250,
                singleEvents: true,
                orderBy: "startTime",
            });

            const events = response.data.items || [];
            return events
                .filter(event => event.id) // Filter out events without id
                .map(event => this.mapGoogleEvent(event)) as GoogleCalendarEvent[];
        } catch {
            console.error("Google Calendar event lookup failed");
            throw new Error("Failed to fetch Google Calendar events");
        }
    }

    /**
     * Get user's Google calendars
     */
    async getCalendars(userId: string) {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });

            const response = await calendar.calendarList.list();
            return response.data.items || [];
        } catch {
            console.error("Google Calendar list lookup failed");
            throw new Error("Failed to fetch Google Calendars");
        }
    }

    async updateCalendarEvent(
        userId: string,
        calendarId: string,
        eventId: string,
        patch: {
            summary?: string;
            description?: string;
            start?: { dateTime?: string; date?: string; timeZone?: string };
            end?: { dateTime?: string; date?: string; timeZone?: string };
            location?: string;
            recurrence?: string[] | null;
        }
    ): Promise<GoogleCalendarEvent> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });
            const response = await calendar.events.patch({
                calendarId,
                eventId,
                requestBody: patch as any,
            });

            return this.mapGoogleEvent(response.data);
        } catch {
            console.error("Google Calendar event update failed");
            throw new Error("Failed to update Google Calendar event");
        }
    }

    async createCalendarEvent(
        userId: string,
        calendarId: string,
        payload: {
            summary: string;
            description?: string;
            start?: { dateTime?: string; date?: string; timeZone?: string };
            end?: { dateTime?: string; date?: string; timeZone?: string };
            location?: string;
            recurrence?: string[];
        }
    ): Promise<GoogleCalendarEvent> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });
            const response = await calendar.events.insert({
                calendarId,
                requestBody: payload as any,
            });

            return this.mapGoogleEvent(response.data);
        } catch {
            console.error("Google Calendar event creation failed");
            throw new Error("Failed to create Google Calendar event");
        }
    }

    async moveCalendarEvent(
        userId: string,
        sourceCalendarId: string,
        eventId: string,
        destinationCalendarId: string
    ): Promise<GoogleCalendarEvent> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });
            const response = await calendar.events.move({
                calendarId: sourceCalendarId,
                eventId,
                destination: destinationCalendarId,
            });

            return this.mapGoogleEvent(response.data);
        } catch {
            console.error("Google Calendar event move failed");
            throw new Error("Failed to move Google Calendar event");
        }
    }

    async deleteCalendarEvent(userId: string, calendarId: string, eventId: string): Promise<void> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });
            await calendar.events.delete({
                calendarId,
                eventId,
            });
        } catch {
            console.error("Google Calendar event deletion failed");
            throw new Error("Failed to delete Google Calendar event");
        }
    }

    async cancelCalendarEventInstance(userId: string, calendarId: string, eventId: string): Promise<void> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            const client = this.client();
            client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: client });
            await calendar.events.patch({
                calendarId,
                eventId,
                requestBody: {
                    status: "cancelled",
                } as any,
            });
        } catch {
            console.error("Google Calendar instance cancellation failed");
            throw new Error("Failed to cancel Google Calendar event instance");
        }
    }

    /**
     * Remove Google tokens for a user
     */
    async removeTokens(userId: string): Promise<void> {
        try {
            await sequelize.transaction(async transaction => {
                const user = await UserEntity.findByPk(userId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!user) {
                    throw new Error("User not found");
                }

                const currentTokens = (user.get("oauthTokens") as any) || {};
                const remainingTokens = { ...currentTokens };
                delete remainingTokens.google;

                await user.update({ oauthTokens: remainingTokens }, { transaction });
            });
        } catch {
            console.error("Google OAuth token removal failed");
            throw new Error("Failed to remove Google tokens");
        }
    }

    /**
     * Check if user has valid Google tokens
     */
    async hasValidTokens(userId: string): Promise<boolean> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            return tokens !== null;
        } catch (error) {
            return false;
        }
    }
}

export default new GoogleOAuthService();
export { GoogleCalendarEvent, GoogleTokens };
