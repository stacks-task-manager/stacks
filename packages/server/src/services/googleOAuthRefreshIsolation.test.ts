import { beforeEach, describe, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({
    userTokens: {} as Record<string, Record<string, unknown>>,
    otherProviderTokens: {} as Record<string, Record<string, unknown>>,
    clients: [] as Array<{ credentials: Record<string, unknown> }>,
    refreshCalls: 0,
    refreshStarted: undefined as (() => void) | undefined,
    gate: null as unknown as Promise<void>,
    releaseGate: undefined as (() => void) | undefined,
}));

vi.mock("@stacks/db", () => ({
    sequelize: {
        transaction: async <T>(callback: (transaction: { LOCK: { UPDATE: string } }) => Promise<T>) =>
            callback({ LOCK: { UPDATE: "UPDATE" } }),
    },
    UserEntity: {
        findByPk: vi.fn(async (userId: string) => ({
            get: (key: string) =>
                key === "oauthTokens"
                    ? {
                          google: state.userTokens[userId],
                          microsoft: state.otherProviderTokens[userId],
                      }
                    : undefined,
            update: async (values: { oauthTokens: { google?: Record<string, unknown> } }) => {
                state.userTokens[userId] = values.oauthTokens.google as Record<string, unknown>;
            },
        })),
    },
}));

vi.mock("googleapis", () => ({
    google: {
        auth: {
            OAuth2: vi.fn(function () {
                const client: {
                    credentials: Record<string, unknown>;
                    setCredentials: (credentials: Record<string, unknown>) => void;
                    refreshAccessToken: () => Promise<{ credentials: Record<string, unknown> }>;
                } = {
                    credentials: {},
                    setCredentials(credentials) {
                        client.credentials = credentials;
                    },
                    async refreshAccessToken() {
                        state.refreshCalls += 1;
                        state.refreshStarted?.();
                        if (state.refreshCalls === 2) state.releaseGate?.();
                        await state.gate;
                        const refreshToken = String(client.credentials.refresh_token);
                        return {
                            credentials: {
                                access_token: `access-for-${refreshToken}`,
                                refresh_token: refreshToken,
                                scope: "calendar",
                                token_type: "Bearer",
                                expiry_date: Date.now() + 60 * 60 * 1000,
                            },
                        };
                    },
                };
                state.clients.push(client);
                return client;
            }),
        },
    },
}));

import googleOAuthService from "./googleOAuthService";

describe("Google OAuth refresh credential isolation", () => {
    beforeEach(() => {
        state.userTokens = {
            userA: {
                access_token: "expired-A",
                refresh_token: "refresh-A",
                scope: "calendar",
                token_type: "Bearer",
                expiry_date: 0,
            },
            userB: {
                access_token: "expired-B",
                refresh_token: "refresh-B",
                scope: "calendar",
                token_type: "Bearer",
                expiry_date: 0,
            },
        };
        state.otherProviderTokens = {};
        state.clients = [];
        state.refreshCalls = 0;
        state.refreshStarted = undefined;
        state.gate = new Promise<void>(resolve => {
            state.releaseGate = resolve;
        });
    });

    test("concurrent refreshes store each user's own refreshed credentials", async () => {
        const [tokensA, tokensB] = await Promise.all([
            googleOAuthService.refreshTokenIfNeeded("userA"),
            googleOAuthService.refreshTokenIfNeeded("userB"),
        ]);

        expect(tokensA?.access_token).toBe("access-for-refresh-A");
        expect(tokensB?.access_token).toBe("access-for-refresh-B");
        expect(state.userTokens.userA?.access_token).toBe("access-for-refresh-A");
        expect(state.userTokens.userB?.access_token).toBe("access-for-refresh-B");
        expect(state.clients).toHaveLength(2);
        expect(state.clients[0]).not.toBe(state.clients[1]);
    });

    test("does not restore Google credentials when a disconnect races with token refresh", async () => {
        state.otherProviderTokens.userA = { access_token: "microsoft-A" };
        let markRefreshStarted!: () => void;
        const refreshStarted = new Promise<void>(resolve => {
            markRefreshStarted = resolve;
        });
        state.refreshStarted = markRefreshStarted;

        const refresh = googleOAuthService.refreshTokenIfNeeded("userA");
        await refreshStarted;
        await googleOAuthService.removeTokens("userA");
        expect(state.userTokens.userA).toBeUndefined();

        state.releaseGate?.();
        await expect(refresh).resolves.toBeNull();

        expect(state.userTokens.userA).toBeUndefined();
        expect(state.otherProviderTokens.userA).toEqual({ access_token: "microsoft-A" });
    });

    test("does not overwrite a newly connected Google account with an older refresh response", async () => {
        let markRefreshStarted!: () => void;
        const refreshStarted = new Promise<void>(resolve => {
            markRefreshStarted = resolve;
        });
        state.refreshStarted = markRefreshStarted;

        const refresh = googleOAuthService.refreshTokenIfNeeded("userA");
        await refreshStarted;
        const replacement = {
            access_token: "access-for-new-account",
            refresh_token: "refresh-for-new-account",
            scope: "calendar",
            token_type: "Bearer",
            expiry_date: Date.now() + 60 * 60 * 1000,
        };
        await googleOAuthService.storeTokens("userA", replacement);

        state.releaseGate?.();
        await expect(refresh).resolves.toBeNull();
        expect(state.userTokens.userA).toEqual(replacement);
    });
});
