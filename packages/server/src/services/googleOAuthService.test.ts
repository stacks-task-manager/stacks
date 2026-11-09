// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findByPk: vi.fn(),
    setCredentials: vi.fn(),
    generateAuthUrl: vi.fn(),
    getToken: vi.fn(),
    patchEvent: vi.fn(),
}));

vi.mock("@stacks/db", () => ({
    sequelize: {
        transaction: async <T>(callback: (transaction: { LOCK: { UPDATE: string } }) => Promise<T>) =>
            callback({ LOCK: { UPDATE: "UPDATE" } }),
    },
    UserEntity: {
        findByPk: mocks.findByPk,
    },
}));

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: vi.fn(function () {
                return {
                    setCredentials: mocks.setCredentials,
                    generateAuthUrl: mocks.generateAuthUrl,
                    getToken: mocks.getToken,
                };
            }),
        },
        calendar: vi.fn(() => ({ events: { patch: mocks.patchEvent } })),
    },
}));

import googleOAuthService from "./googleOAuthService";

describe("googleOAuthService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("removes stored Google tokens server-side without dropping other providers", async () => {
        const oauthTokens = {
            google: {
                access_token: "google-access",
                refresh_token: "google-refresh",
                scope: "calendar",
                token_type: "Bearer",
                expiry_date: Date.now() + 60_000,
            },
            microsoft: {
                access_token: "microsoft-access",
                refresh_token: "microsoft-refresh",
                scope: "calendar",
                token_type: "Bearer",
                expiry_date: Date.now() + 60_000,
            },
        };
        const user = {
            get: vi.fn(() => oauthTokens),
            update: vi.fn(),
        };
        mocks.findByPk.mockResolvedValue(user);

        await googleOAuthService.removeTokens("user-1");

        expect(user.update).toHaveBeenCalledWith(
            {
                oauthTokens: {
                    microsoft: oauthTokens.microsoft,
                },
            },
            { transaction: expect.any(Object) }
        );
        expect(oauthTokens.google).toBeDefined();
        expect(mocks.setCredentials).toHaveBeenCalledTimes(0);
    });

    it("uses the stored credentials and cancelled status for one recurring instance", async () => {
        const tokens = {
            access_token: "google-access",
            refresh_token: "google-refresh",
            scope: "calendar",
            token_type: "Bearer",
            expiry_date: Date.now() + 10 * 60_000,
        };
        mocks.findByPk.mockResolvedValue({ get: vi.fn(() => ({ google: tokens })) });

        await googleOAuthService.cancelCalendarEventInstance("user-1", "calendar-1", "instance-1");

        expect(mocks.setCredentials).toHaveBeenCalledWith({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        });
        expect(mocks.patchEvent).toHaveBeenCalledWith({
            calendarId: "calendar-1",
            eventId: "instance-1",
            requestBody: { status: "cancelled" },
        });
    });

    it("does not log provider errors that contain credential sentinels", async () => {
        mocks.getToken.mockRejectedValue(new Error("provider access_token=google-secret-sentinel"));
        const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(googleOAuthService.getTokens("authorization-code", "verifier")).rejects.toThrow(
            "Failed to exchange authorization code for tokens"
        );
        expect(logError.mock.calls.flat().join(" ")).not.toContain("google-secret-sentinel");
        logError.mockRestore();
    });
});
