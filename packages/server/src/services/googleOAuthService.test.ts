// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findByPk: vi.fn(),
    setCredentials: vi.fn(),
    generateAuthUrl: vi.fn(),
}));

vi.mock("@stacks/db", () => ({
    UserEntity: {
        findByPk: mocks.findByPk,
    },
}));

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: vi.fn(() => ({
                setCredentials: mocks.setCredentials,
                generateAuthUrl: mocks.generateAuthUrl,
            })),
        },
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

        expect(user.update).toHaveBeenCalledWith({
            oauthTokens: {
                microsoft: oauthTokens.microsoft,
            },
        });
        expect(oauthTokens.google).toBeDefined();
        expect(mocks.setCredentials).toHaveBeenCalledWith({});
    });
});
