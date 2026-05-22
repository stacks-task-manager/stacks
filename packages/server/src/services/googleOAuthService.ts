// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { UserEntity } from "@stacks/db";
import { google } from "googleapis";

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
}

class GoogleOAuthService {
    private oauth2Client: any;
    private config: GoogleOAuthConfig;

    constructor() {
        this.config = {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback",
        };

        this.oauth2Client = new google.auth.OAuth2(
            this.config.clientId,
            this.config.clientSecret,
            this.config.redirectUri
        );
    }

    /**
     * Generate Google OAuth authorization URL
     */
    getAuthUrl(): string {
        const scopes = [
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            prompt: "consent",
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokens(code: string): Promise<GoogleTokens> {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            return {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date,
            };
        } catch (error) {
            console.error("Error getting tokens:", error);
            throw new Error("Failed to exchange authorization code for tokens");
        }
    }

    /**
     * Store Google tokens for a user
     */
    async storeTokens(userId: string, tokens: GoogleTokens): Promise<void> {
        try {
            const user = await UserEntity.findByPk(userId);
            if (!user) {
                throw new Error("User not found");
            }

            const currentTokens = (user.get("oauthTokens") as any) || {};
            const updatedTokens = {
                ...currentTokens,
                google: tokens,
            };

            await user.update({ oauthTokens: updatedTokens });
        } catch (error) {
            console.error("Error storing tokens:", error);
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
        } catch (error) {
            console.error("Error getting stored tokens:", error);
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
            this.oauth2Client.setCredentials({
                refresh_token: tokens.refresh_token,
            });

            const { credentials } = await this.oauth2Client.refreshAccessToken();
            const refreshedTokens: GoogleTokens = {
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token || tokens.refresh_token,
                scope: credentials.scope || tokens.scope,
                token_type: credentials.token_type || tokens.token_type,
                expiry_date: credentials.expiry_date || Date.now() + 3600000,
            };

            await this.storeTokens(userId, refreshedTokens);
            return refreshedTokens;
        } catch (error) {
            console.error("Error refreshing token:", error);
            return null;
        }
    }

    /**
     * Get Google Calendar events for a user
     */
    async getCalendarEvents(
        userId: string,
        timeMin?: string,
        timeMax?: string
    ): Promise<GoogleCalendarEvent[]> {
        try {
            const tokens = await this.refreshTokenIfNeeded(userId);
            if (!tokens) {
                throw new Error("No valid Google tokens found");
            }

            this.oauth2Client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

            const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: timeMin || new Date().toISOString(),
                timeMax: timeMax,
                maxResults: 250,
                singleEvents: true,
                orderBy: "startTime",
            });

            const events = response.data.items || [];
            return events
                .filter(event => event.id) // Filter out events without id
                .map(event => ({
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
                    attendees: event.attendees?.map(attendee => ({
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
                })) as GoogleCalendarEvent[];
        } catch (error) {
            console.error("Error fetching calendar events:", error);
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

            this.oauth2Client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            });

            const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

            const response = await calendar.calendarList.list();
            return response.data.items || [];
        } catch (error) {
            console.error("Error fetching calendars:", error);
            throw new Error("Failed to fetch Google Calendars");
        }
    }

    /**
     * Remove Google tokens for a user
     */
    async removeTokens(userId: string): Promise<void> {
        try {
            const user = await UserEntity.findByPk(userId);
            if (!user) {
                throw new Error("User not found");
            }

            const currentTokens = (user.get("oauthTokens") as any) || {};
            delete currentTokens.google;

            await user.update({ oauthTokens: currentTokens });
        } catch (error) {
            console.error("Error removing tokens:", error);
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
