// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T07: one Google OAuth attempt per browser flow. The state value, the browser
 * nonce, and the PKCE verifier belong to a row written when the client asks for
 * the authorization URL, and only a callback that presents all three — from the
 * same session and account — can redeem it. A rejected callback exchanges
 * nothing with the provider, and a redeemed attempt is consumed before the
 * provider is called, so replays, expired attempts, and provider failures never
 * link credentials twice.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import app from "../../src/index";
import { mintSessionToken } from "../helpers/authHelper";
import { OAUTH_NONCE_COOKIE } from "../../src/config/oauthAttempts";
import { hashAccountToken } from "../../src/services/accountTokens";
import googleOAuthService from "../../src/services/googleOAuthService";
import { OAuthAttemptEntity, RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { google } from "googleapis";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";

const PASSWORD = "testpassword123";

/**
 * The provider is replaced for this test file only — the module instance is not
 * shared with other test files — so no request leaves the process and every
 * exchange is observable.
 */
const providerCalls: { method: string; clientId: string; detail: any }[] = [];

afterEach(() => vi.restoreAllMocks());

class FakeOAuth2Client {
    private id: string = randomUUID();
    private credentials: any = {};

    generateAuthUrl(opts: any): string {
        providerCalls.push({ method: "auth-url", clientId: this.id, detail: opts });
        const query = new URLSearchParams({
            client_id: "fixture-client",
            redirect_uri: "http://localhost:3000/api/google/callback",
            response_type: "code",
            access_type: String(opts.access_type),
            scope: (opts.scope as string[]).join(" "),
            prompt: String(opts.prompt),
            state: String(opts.state),
            code_challenge: String(opts.code_challenge),
            code_challenge_method: String(opts.code_challenge_method),
        });
        return "https://accounts.google.com/o/oauth2/v2/auth?" + query.toString();
    }

    async getToken(args: any): Promise<any> {
        providerCalls.push({ method: "getToken", clientId: this.id, detail: args });
        if (args.code === "provider-outage") {
            throw new Error("provider failure access_token=oauth-secret-sentinel");
        }
        return {
            tokens: {
                access_token: "fixture-access-" + String(args.code),
                refresh_token: "fixture-refresh-" + String(args.code),
                scope: "https://www.googleapis.com/auth/calendar",
                token_type: "Bearer",
                expiry_date: Date.now() + 3600000,
            },
        };
    }

    setCredentials(credentials: any): void {
        this.credentials = credentials;
    }

    async refreshAccessToken(): Promise<any> {
        providerCalls.push({ method: "refresh", clientId: this.id, detail: this.credentials });
        const refreshToken = String(this.credentials.refresh_token ?? "");
        return {
            credentials: {
                access_token: "fixture-refreshed-" + refreshToken,
                refresh_token: refreshToken,
                scope: "https://www.googleapis.com/auth/calendar",
                token_type: "Bearer",
                expiry_date: Date.now() + 3600000,
            },
        };
    }
}

(google as any).auth.OAuth2 = FakeOAuth2Client;

const exchangeCount = async (): Promise<number> =>
    providerCalls.filter(entry => entry.method === "getToken").length;

/** Rows seeded by these tests; hard-deleted by cleanupSeededRows so fixtures never leak. */
const seededRows: any[] = [];
const fixtureUserIds: string[] = [];

const cleanupSeededRows = async (): Promise<void> => {
    while (seededRows.length > 0) {
        const row = seededRows.pop();
        try {
            await row.destroy({ force: true });
        } catch (error) {
            console.warn("T07 fixture cleanup failed:", error);
        }
    }
    if (fixtureUserIds.length > 0) {
        try {
            await OAuthAttemptEntity.destroy({ where: { userId: fixtureUserIds }, force: true });
        } catch (error) {
            console.warn("T07 attempt cleanup failed:", error);
        }
    }
};

const activeTenant = async (): Promise<string> => {
    const tenant = await TenantEntity.findOne({ where: {} });
    return String(tenant.get("id"));
};

/** A fixture account that can complete the Google OAuth flows. */
const fixtureUser = async (label: string) => {
    const tenant = await activeTenant();
    const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
    const user = await UserEntity.create({
        email: `t07-${label}-${randomUUID()}@example.com`,
        password: await hash(PASSWORD, 10),
        firstName: "Attempt",
        lastName: "Subject",
        real: true,
        role: role.get("id"),
        tenant,
    });
    seededRows.push(user);
    fixtureUserIds.push(String(user.get("id")));
    return user;
};

/** A session-bound credential for a fixture account, plus the row behind it. */
const sessionFor = async (user: any) => {
    const { sid, token, row } = await mintSessionToken(
        String(user.get("id")),
        String(user.get("tenant")),
        3600
    );
    seededRows.push(row);
    return { sid, token };
};

const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

/** The browser nonce the auth-url response asked the browser to keep. */
const nonceValueOf = (res: any): string => {
    const line = (res.headers.get("set-cookie") ?? "")
        .split(", ")
        .find(part => part.startsWith(OAUTH_NONCE_COOKIE + "="));
    return line ? line.split("=")[1].split(";")[0] : "";
};

const authUrlRequest = async (token: string) =>
    await app.request("/api/google/auth-url", { headers: bearer(token) });

const callbackRequest = async (token: string, query: Record<string, string>, cookie: string) =>
    await app.request("/api/google/callback?" + new URLSearchParams(query).toString(), {
        headers: { ...bearer(token), ...(cookie ? { Cookie: cookie } : {}) },
    });

const bodyOf = async (res: any): Promise<string> => await res.text();

const attemptRowFor = async (state: string) =>
    await OAuthAttemptEntity.findOne({ where: { stateHash: hashAccountToken(state) } });

const storedGoogleTokens = async (user: any) => {
    const row = await UserEntity.findByPk(String(user.get("id")));
    return ((row.get("oauthTokens") as any) || {}).google ?? null;
};

const stateOf = async (res: any): Promise<string> =>
    new URL(((await res.json()) as any).data.authUrl).searchParams.get("state");

describe("Google OAuth attempt binding", () => {
    test("the authorization URL carries a fresh state and PKCE challenge", async () => {
        const user = await fixtureUser("url");
        const { token, sid } = await sessionFor(user);

        const first = await authUrlRequest(token);
        expect(first.status).toBe(200);
        expect(first.headers.get("cache-control")).toBe("private, no-store");
        expect(first.headers.get("cache-control")).toBe("private, no-store");
        const firstState = await stateOf(first);
        const nonce = nonceValueOf(first);

        const second = await authUrlRequest(token);
        const secondState = await stateOf(second);

        // The provider sees the state and the S256 challenge, never the verifier.
        const urlCalls = providerCalls.filter(entry => entry.method === "auth-url");
        expect(urlCalls.length).toBe(2);
        expect(urlCalls[1].detail.state).toBe(secondState);
        expect(urlCalls[1].detail.code_challenge_method).toBe("S256");
        expect(urlCalls[1].detail.code_challenge.length >= 43).toBe(true);
        expect(urlCalls[0].detail.state === urlCalls[1].detail.state).toBe(false);
        expect(urlCalls[0].clientId === urlCalls[1].clientId).toBe(false);

        // The row keeps only hashes, and it is bound to this account and session.
        const row = await attemptRowFor(firstState);
        expect(row === null).toBe(false);
        expect(String(row.get("userId"))).toBe(String(user.get("id")));
        expect(String(row.get("tenant"))).toBe(String(user.get("tenant")));
        expect(String(row.get("sid"))).toBe(sid);
        expect(String(row.get("stateHash"))).toBe(hashAccountToken(firstState));
        expect(JSON.stringify(row.toJSON()).includes(firstState)).toBe(false);
        expect(nonce.length >= 43).toBe(true);
        expect(JSON.stringify(row.toJSON()).includes(nonce)).toBe(false);

        await cleanupSeededRows();
    });

    test("an unsolicited callback links nothing", async () => {
        const user = await fixtureUser("unsolicited");
        const { token } = await sessionFor(user);

        const before = await exchangeCount();
        const res = await callbackRequest(token, { code: "unsolicited-code" }, "");
        expect(res.status).toBe(200);
        expect(await bodyOf(res)).toContain("Authentication failed");

        // Nothing was exchanged, so no credential was linked.
        expect(await exchangeCount()).toBe(before);
        expect(await storedGoogleTokens(user)).toBe(null);

        await cleanupSeededRows();
    });

    test("a foreign or expired state is rejected before the provider runs", async () => {
        const user = await fixtureUser("foreign");
        const { token } = await sessionFor(user);

        const before = await exchangeCount();
        const foreign = await callbackRequest(token, { code: "c", state: randomUUID() }, "");
        expect(await bodyOf(foreign)).toContain("Authentication failed");
        expect(await exchangeCount()).toBe(before);
        expect(await storedGoogleTokens(user)).toBe(null);

        // An attempt whose window already passed cannot be redeemed even with its
        // own state and nonce.
        const nonce = randomUUID();
        await OAuthAttemptEntity.create({
            userId: String(user.get("id")),
            tenant: String(user.get("tenant")),
            sid: randomUUID(),
            stateHash: hashAccountToken("expired-state"),
            nonceHash: hashAccountToken(nonce),
            codeVerifier: "fixture-verifier",
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
            expiresAt: new Date(Date.now() - 60 * 1000),
        });
        const expired = await callbackRequest(
            token,
            { code: "c", state: "expired-state" },
            OAUTH_NONCE_COOKIE + "=" + nonce
        );
        expect(await bodyOf(expired)).toContain("Authentication failed");
        expect(await exchangeCount()).toBe(before);
        expect(await storedGoogleTokens(user)).toBe(null);

        await cleanupSeededRows();
    });

    test("the callback must come from the browser and session that started the flow", async () => {
        const user = await fixtureUser("browser");
        const { token } = await sessionFor(user);

        const started = await authUrlRequest(token);
        const state = await stateOf(started);
        const cookie = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(started);

        // Without the nonce cookie the callback cannot prove it is the same browser.
        const absent = await callbackRequest(token, { code: "c", state }, "");
        expect(await bodyOf(absent)).toContain("Authentication failed");
        expect(await storedGoogleTokens(user)).toBe(null);

        // A nonce from a later flow is not the one that started this flow.
        const swapped = await authUrlRequest(token);
        const wrongCookie = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(swapped);
        const mismatched = await callbackRequest(token, { code: "c", state }, wrongCookie);
        expect(await bodyOf(mismatched)).toContain("Authentication failed");
        expect(await storedGoogleTokens(user)).toBe(null);

        // A second session for the same account is a different browser flow.
        const other = await sessionFor(user);
        const crossSession = await callbackRequest(other.token, { code: "c", state }, cookie);
        expect(await bodyOf(crossSession)).toContain("Authentication failed");
        expect(await storedGoogleTokens(user)).toBe(null);

        // The matching browser and session redeem it once.
        const ok = await callbackRequest(token, { code: "linked-code", state }, cookie);
        expect(await bodyOf(ok)).toContain("Authentication successful");
        const tokens = await storedGoogleTokens(user);
        expect(tokens === null).toBe(false);
        expect(tokens.access_token).toBe("fixture-access-linked-code");

        await cleanupSeededRows();
    });

    test("a replayed callback is refused, including concurrent callbacks", async () => {
        const user = await fixtureUser("replay");
        const { token } = await sessionFor(user);

        const started = await authUrlRequest(token);
        const state = await stateOf(started);
        const cookie = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(started);

        const first = await callbackRequest(token, { code: "first-code", state }, cookie);
        expect(await bodyOf(first)).toContain("Authentication successful");

        const replay = await callbackRequest(token, { code: "replay-code", state }, cookie);
        expect(await bodyOf(replay)).toContain("Authentication failed");
        expect((await storedGoogleTokens(user)) === null).toBe(false);

        // Two callbacks for one state have exactly one winner.
        const second = await authUrlRequest(token);
        const state2 = await stateOf(second);
        const cookie2 = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(second);
        const raced = await Promise.all([
            callbackRequest(token, { code: "race-a", state: state2 }, cookie2),
            callbackRequest(token, { code: "race-b", state: state2 }, cookie2),
        ]);
        const bodies = [];
        for (const res of raced) {
            bodies.push(await bodyOf(res));
        }
        const winners = bodies.filter(body => body.includes("Authentication successful"));
        expect(winners.length).toBe(1);

        await cleanupSeededRows();
    });

    test("a provider failure or denial still consumes the attempt", async () => {
        const user = await fixtureUser("failure");
        const { token } = await sessionFor(user);

        const before = await exchangeCount();
        const started = await authUrlRequest(token);
        const state = await stateOf(started);
        const cookie = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(started);
        const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const failed = await callbackRequest(token, { code: "provider-outage", state }, cookie);
        expect(await bodyOf(failed)).toContain("Authentication failed");
        expect(logError.mock.calls.flat().join(" ")).not.toContain("oauth-secret-sentinel");
        expect(await exchangeCount()).toBe(before + 1);
        expect(await storedGoogleTokens(user)).toBe(null);

        // The attempt is already burned, so a retry is refused even with a good code.
        const retry = await callbackRequest(token, { code: "after-outage", state }, cookie);
        expect(await bodyOf(retry)).toContain("Authentication failed");
        expect(await exchangeCount()).toBe(before + 1);

        // A provider denial consumes the attempt too.
        const second = await authUrlRequest(token);
        const state2 = await stateOf(second);
        const cookie2 = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(second);
        const denied = await callbackRequest(token, { error: "access_denied", state: state2 }, cookie2);
        expect(await bodyOf(denied)).toContain("Authentication failed");
        const afterDenial = await callbackRequest(token, { code: "after-denial", state: state2 }, cookie2);
        expect(await bodyOf(afterDenial)).toContain("Authentication failed");

        await cleanupSeededRows();
    });

    test("two accounts keep separate provider clients and credentials", async () => {
        const first = await fixtureUser("first");
        const second = await fixtureUser("second");
        const firstSession = await sessionFor(first);
        const secondSession = await sessionFor(second);

        const firstStart = await authUrlRequest(firstSession.token);
        const firstState = await stateOf(firstStart);
        const firstCookie = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(firstStart);

        const secondStart = await authUrlRequest(secondSession.token);
        const secondState = await stateOf(secondStart);
        const secondCookie = OAUTH_NONCE_COOKIE + "=" + nonceValueOf(secondStart);

        // Each browser's state is bound to its own account.
        const crossed = await callbackRequest(
            secondSession.token,
            { code: "crossed", state: firstState },
            firstCookie
        );
        expect(await bodyOf(crossed)).toContain("Authentication failed");
        expect(await storedGoogleTokens(second)).toBe(null);

        const firstOk = await callbackRequest(
            firstSession.token,
            { code: "first-code", state: firstState },
            firstCookie
        );
        expect(await bodyOf(firstOk)).toContain("Authentication successful");
        const secondOk = await callbackRequest(
            secondSession.token,
            { code: "second-code", state: secondState },
            secondCookie
        );
        expect(await bodyOf(secondOk)).toContain("Authentication successful");

        const firstTokens = await storedGoogleTokens(first);
        const secondTokens = await storedGoogleTokens(second);
        expect(firstTokens.access_token).toBe("fixture-access-first-code");
        expect(secondTokens.access_token).toBe("fixture-access-second-code");

        // A refresh for one account must not reuse another account's client.
        await UserEntity.update(
            { oauthTokens: { google: { ...firstTokens, expiry_date: Date.now() - 1000 } } },
            { where: { id: String(first.get("id")) } }
        );
        await UserEntity.update(
            { oauthTokens: { google: { ...secondTokens, expiry_date: Date.now() - 1000 } } },
            { where: { id: String(second.get("id")) } }
        );
        const refreshedFirst = await googleOAuthService.refreshTokenIfNeeded(String(first.get("id")));
        const refreshedSecond = await googleOAuthService.refreshTokenIfNeeded(String(second.get("id")));
        expect(refreshedFirst.access_token).toBe("fixture-refreshed-fixture-refresh-first-code");
        expect(refreshedSecond.access_token).toBe("fixture-refreshed-fixture-refresh-second-code");

        const refreshCalls = providerCalls.filter(entry => entry.method === "refresh");
        expect(refreshCalls.length).toBe(2);
        expect(refreshCalls[0].clientId === refreshCalls[1].clientId).toBe(false);

        // Disconnect clears only that account.
        const disconnected = await app.request("/api/google/disconnect", {
            method: "DELETE",
            headers: bearer(firstSession.token),
        });
        expect(disconnected.status).toBe(200);
        expect(await storedGoogleTokens(first)).toBe(null);
        expect(((await storedGoogleTokens(second)) as any).access_token).toBe(
            "fixture-refreshed-fixture-refresh-second-code"
        );

        await cleanupSeededRows();
    });
});
