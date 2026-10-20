// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserEntity } from "@stacks/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const provider = vi.hoisted(() => ({
    credentials: {} as Record<string, unknown>,
    refreshStarted: undefined as (() => void) | undefined,
    releaseRefresh: undefined as (() => void) | undefined,
}));

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: vi.fn(function () {
                return {
                    setCredentials(credentials: Record<string, unknown>) {
                        provider.credentials = credentials;
                    },
                    async refreshAccessToken() {
                        provider.refreshStarted?.();
                        await new Promise<void>(resolve => {
                            provider.releaseRefresh = resolve;
                        });
                        return {
                            credentials: {
                                access_token: "refreshed-access-token",
                                refresh_token: provider.credentials.refresh_token,
                                scope: "calendar",
                                token_type: "Bearer",
                                expiry_date: Date.now() + 60 * 60 * 1000,
                            },
                        };
                    },
                };
            }),
        },
    },
}));

import googleOAuthService from "../../src/services/googleOAuthService";

let userId = "";

describe("Google OAuth refresh and disconnect persistence", () => {
    beforeEach(() => {
        provider.credentials = {};
        provider.refreshStarted = undefined;
        provider.releaseRefresh = undefined;
    });

    afterEach(async () => {
        if (!userId) return;
        await UserEntity.destroy({ where: { id: userId }, force: true });
        expect(await UserEntity.findByPk(userId)).toBeNull();
        userId = "";
    });

    it("does not restore a disconnected Google account after a provider refresh completes", async () => {
        const credentials = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const baseUser = await UserEntity.findOne({ where: { email: credentials.email } });
        expect(baseUser).not.toBeNull();
        const tenant = String(baseUser!.get("tenant"));
        const roleId = String(baseUser!.get("role"));
        const user = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: "temporary-test-password",
            firstName: "OAuth Refresh",
            lastName: "Isolation",
            role: roleId,
            tenant,
            admin: false,
            real: false,
            oauthTokens: {
                google: {
                    access_token: "expired-access-token",
                    refresh_token: "refresh-token-for-user",
                    scope: "calendar",
                    token_type: "Bearer",
                    expiry_date: 0,
                },
                microsoft: { access_token: "preserve-other-provider" },
            },
        });
        userId = String(user.get("id"));

        let signalRefreshStarted!: () => void;
        const refreshStarted = new Promise<void>(resolve => {
            signalRefreshStarted = resolve;
        });
        provider.refreshStarted = signalRefreshStarted;

        const refresh = googleOAuthService.refreshTokenIfNeeded(userId);
        await refreshStarted;
        await googleOAuthService.removeTokens(userId);
        const disconnected = await UserEntity.findByPk(userId);
        expect((disconnected!.get("oauthTokens") as Record<string, unknown>).google).toBeUndefined();

        provider.releaseRefresh?.();
        await expect(refresh).resolves.toBeNull();

        const persisted = await UserEntity.findByPk(userId);
        const oauthTokens = persisted!.get("oauthTokens") as Record<string, unknown>;
        expect(oauthTokens.google).toBeUndefined();
        expect(oauthTokens.microsoft).toEqual({ access_token: "preserve-other-provider" });
    });
});
