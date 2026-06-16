// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { registerResponseHelpers } from "../../services/response";

const mocks = vi.hoisted(() => {
    const googleOAuthService = {
        getAuthUrl: vi.fn(),
        getTokens: vi.fn(),
        storeTokens: vi.fn(),
        hasValidTokens: vi.fn(),
        removeTokens: vi.fn(),
        getCalendars: vi.fn(),
    };

    return {
        googleOAuthService,
        user: {
            id: "user-123",
            email: "user@example.com",
        },
    };
});

vi.mock("@stacks/translations", () => ({
    translate: (value: string) => value,
}));

vi.mock("../../config/postMessageOrigin", () => ({
    postMessageTargetOrigin: () => "https://app.example.com",
}));

vi.mock("../../middleware/auth", () => ({
    requireAuth: async (c: any, next: () => Promise<void>) => {
        c.set("user", mocks.user);
        c.set("userId", mocks.user.id);
        await next();
    },
}));

vi.mock("../../services/googleOAuthService", () => ({
    default: mocks.googleOAuthService,
}));

import googleAuth from "../googleAuth";

function buildApp() {
    const app = new Hono();
    registerResponseHelpers(app);
    app.route("/google", googleAuth);
    return app;
}

describe("googleAuth routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns the Google authorization URL", async () => {
        mocks.googleOAuthService.getAuthUrl.mockReturnValue(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=test"
        );

        const res = await buildApp().request("/google/auth-url");
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            data: {
                authUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
            },
        });
        expect(mocks.googleOAuthService.getAuthUrl).toHaveBeenCalledTimes(1);
    });

    it("returns a 500 when generating the authorization URL fails", async () => {
        mocks.googleOAuthService.getAuthUrl.mockImplementation(() => {
            throw new Error("boom");
        });

        const res = await buildApp().request("/google/auth-url");
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: "Failed to generate authorization URL" });
    });

    it("renders popup HTML for OAuth callback errors without exchanging tokens", async () => {
        const res = await buildApp().request("/google/callback?error=access_denied");
        const body = await res.text();

        expect(res.status).toBe(200);
        expect(body).toContain("GOOGLE_AUTH_ERROR");
        expect(body).toContain("access_denied");
        expect(body).toContain("https://app.example.com");
        expect(mocks.googleOAuthService.getTokens).not.toHaveBeenCalled();
        expect(mocks.googleOAuthService.storeTokens).not.toHaveBeenCalled();
    });

    it("returns 400 when the callback is missing an authorization code", async () => {
        const res = await buildApp().request("/google/callback");
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ error: "Authorization code is required" });
    });

    it("stores Google tokens from the GET callback and returns success popup HTML", async () => {
        const tokens = {
            access_token: "access-token",
            refresh_token: "refresh-token",
            scope: "scope",
            token_type: "Bearer",
            expiry_date: 1234567890,
        };
        mocks.googleOAuthService.getTokens.mockResolvedValue(tokens);
        mocks.googleOAuthService.storeTokens.mockResolvedValue(undefined);

        const res = await buildApp().request("/google/callback?code=auth-code");
        const body = await res.text();

        expect(res.status).toBe(200);
        expect(body).toContain("GOOGLE_AUTH_SUCCESS");
        expect(body).toContain("Authentication successful!");
        expect(mocks.googleOAuthService.getTokens).toHaveBeenCalledWith("auth-code");
        expect(mocks.googleOAuthService.storeTokens).toHaveBeenCalledWith("user-123", tokens);
    });

    it("stores Google tokens from the POST callback body", async () => {
        const tokens = {
            access_token: "access-token",
            refresh_token: "refresh-token",
            scope: "scope",
            token_type: "Bearer",
            expiry_date: 1234567890,
        };
        mocks.googleOAuthService.getTokens.mockResolvedValue(tokens);
        mocks.googleOAuthService.storeTokens.mockResolvedValue(undefined);

        const res = await buildApp().request("/google/callback", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ code: "post-auth-code" }),
        });
        const body = await res.text();

        expect(res.status).toBe(200);
        expect(body).toContain("GOOGLE_AUTH_SUCCESS");
        expect(mocks.googleOAuthService.getTokens).toHaveBeenCalledWith("post-auth-code");
        expect(mocks.googleOAuthService.storeTokens).toHaveBeenCalledWith("user-123", tokens);
    });

    it("returns the Google authentication status", async () => {
        mocks.googleOAuthService.hasValidTokens.mockResolvedValue(true);

        const res = await buildApp().request("/google/status");
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            data: {
                isAuthenticated: true,
                provider: "google",
            },
        });
        expect(mocks.googleOAuthService.hasValidTokens).toHaveBeenCalledWith("user-123");
    });

    it("returns a standardized error when checking Google auth status fails", async () => {
        mocks.googleOAuthService.hasValidTokens.mockRejectedValue(new Error("status failure"));

        const res = await buildApp().request("/google/status", {
            headers: { Locale: "en" },
        });
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toMatchObject({
            success: false,
            message: "Google auth check failed",
        });
    });

    it.each(["DELETE", "POST"] as const)(
        "disconnects the Google account via %s /disconnect",
        async method => {
            mocks.googleOAuthService.removeTokens.mockResolvedValue(undefined);

            const res = await buildApp().request("/google/disconnect", { method });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toMatchObject({
                success: true,
                data: { disconnected: true },
                message: "Google account disconnected successfully",
            });
            expect(mocks.googleOAuthService.removeTokens).toHaveBeenCalledWith("user-123");
        }
    );

    it("normalizes Google calendars for the client", async () => {
        mocks.googleOAuthService.getCalendars.mockResolvedValue([
            {
                id: "primary",
                summary: "Personal",
                backgroundColor: "#123456",
                primary: true,
                accessRole: "owner",
            },
            {
                id: "team",
                summary: undefined,
                backgroundColor: undefined,
                primary: false,
                accessRole: "reader",
            },
            {
                id: "writer-calendar",
                summary: "Writable",
                backgroundColor: "#abcdef",
                primary: false,
                accessRole: "writer",
            },
        ]);

        const res = await buildApp().request("/google/calendars");
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            data: [
                {
                    id: "primary",
                    title: "Personal",
                    color: "#123456",
                    source: "google",
                    primary: true,
                    readOnly: false,
                },
                {
                    id: "team",
                    title: "",
                    color: "#1976d2",
                    source: "google",
                    primary: false,
                    readOnly: true,
                },
                {
                    id: "writer-calendar",
                    title: "Writable",
                    color: "#abcdef",
                    source: "google",
                    primary: false,
                    readOnly: false,
                },
            ],
        });
        expect(mocks.googleOAuthService.getCalendars).toHaveBeenCalledWith("user-123");
    });

    it("returns a 500 when fetching Google calendars fails", async () => {
        mocks.googleOAuthService.getCalendars.mockRejectedValue(new Error("calendar failure"));

        const res = await buildApp().request("/google/calendars");
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: "Failed to fetch Google calendars" });
    });
});
