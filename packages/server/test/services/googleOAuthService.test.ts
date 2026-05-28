// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, vi, beforeEach } from "vitest";
import googleOAuthService from "../../src/services/googleOAuthService";

describe("GoogleOAuthService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAuthUrl", () => {
        test("returns an OAuth URL string", () => {
            const url = googleOAuthService.getAuthUrl();
            expect(typeof url).toBe("string");
            expect(url).toContain("accounts.google.com");
            expect(url).toContain("oauth2/v2/auth");
        });

        test("includes required scopes", () => {
            const url = googleOAuthService.getAuthUrl();
            expect(url).toContain("calendar.readonly");
            expect(url).toContain("userinfo.email");
            expect(url).toContain("userinfo.profile");
        });

        test("includes offline access type for refresh tokens", () => {
            const url = googleOAuthService.getAuthUrl();
            expect(url).toContain("access_type=offline");
        });

        test("includes consent prompt", () => {
            const url = googleOAuthService.getAuthUrl();
            expect(url).toContain("prompt=consent");
        });
    });

    describe("hasValidTokens", () => {
        test("returns false when no tokens stored", async () => {
            const nonExistentId = "00000000-0000-0000-0000-000000000099";
            const result = await googleOAuthService.hasValidTokens(nonExistentId);
            expect(result).toBe(false);
        });
    });

    describe("getCalendars", () => {
        test("throws when no valid tokens exist", async () => {
            const nonExistentId = "00000000-0000-0000-0000-000000000099";
            await expect(googleOAuthService.getCalendars(nonExistentId)).rejects.toThrow(
                "Failed to fetch Google Calendars"
            );
        });
    });

    describe("removeTokens", () => {
        test("throws when user not found", async () => {
            const nonExistentId = "00000000-0000-0000-0000-000000000099";
            // The service wraps "User not found" in "Failed to remove Google tokens"
            await expect(googleOAuthService.removeTokens(nonExistentId)).rejects.toThrow(
                "Failed to remove Google tokens"
            );
        });
    });

    describe("getStoredTokens", () => {
        test("returns null for non-existent user", async () => {
            const nonExistentId = "00000000-0000-0000-0000-000000000099";
            const result = await googleOAuthService.getStoredTokens(nonExistentId);
            expect(result).toBeNull();
        });
    });

    describe("refreshTokenIfNeeded", () => {
        test("returns null when no tokens stored", async () => {
            const nonExistentId = "00000000-0000-0000-0000-000000000099";
            const result = await googleOAuthService.refreshTokenIfNeeded(nonExistentId);
            expect(result).toBeNull();
        });
    });

    describe("getCalendarEvents", () => {
        test("throws when no valid tokens exist", async () => {
            const nonExistentId = "00000000-0000-0000-0000-000000000099";
            await expect(googleOAuthService.getCalendarEvents(nonExistentId)).rejects.toThrow(
                "Failed to fetch Google Calendar events"
            );
        });
    });
});
