// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T05: credentials are seven-day sessions backed by a DB row. Every transport must
 * re-check that row, so a token whose session was revoked (logout, password reset,
 * activation) stops working even as a replay; cookies carry the protective flags
 * and never outlive the token; and the account policy runs on every transport.
 */
import { describe, expect, test, vi } from "vitest";
import app from "../../src/index";
import { startSocketHarness } from "../helpers/socketHarness";
import { getAuthenticatedHeaders } from "../helpers/authHelper";
import { translate } from "@stacks/translations";
import { getJwtSecret } from "../../src/config/secrets";
import {
    SESSION_AUDIENCE,
    SESSION_ISSUER,
    SESSION_LIFETIME_SECONDS,
    tokenClaims,
} from "../../src/config/session";
import { issueSession, revokeSession, sessionStillValid } from "../../src/services/sessions";
import { createPasswordResetToken, hashAccountToken } from "../../src/services/accountTokens";
import { EmailQueueEntity, RoleEntity, SessionEntity, TenantEntity, UserEntity } from "@stacks/db";
import { sign } from "hono/jwt";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { cacheInstances } from "../../src/utils/cache";

const PASSWORD = "testpassword123";

/** Rows seeded by these tests; hard-deleted by cleanupSeededRows so fixtures never leak. */
const seededRows: any[] = [];

const cleanupSeededRows = async (): Promise<void> => {
    while (seededRows.length > 0) {
        const row = seededRows.pop();
        try {
            await row.destroy({ force: true });
        } catch (error) {
            console.warn("T05 fixture cleanup failed:", error);
        }
    }
};

const activeTenant = async (): Promise<string> => {
    const tenant = await TenantEntity.findOne({ where: {} });
    return String(tenant.get("id"));
};

/** A fixture account that can complete both login flows. */
const fixtureUser = async (fields: Record<string, any> = {}) => {
    const tenant = await activeTenant();
    const role = await RoleEntity.findOne({ where: { title: "User", tenant } });
    const user = await UserEntity.create({
        email: `t05-${randomUUID()}@example.com`,
        password: await hash(PASSWORD, 10),
        firstName: "Session",
        lastName: "Subject",
        real: true,
        role: role.get("id"),
        tenant,
        ...fields,
    });
    seededRows.push(user);
    return user;
};

/** Issues a session for a fixture account and tracks the row it creates. */
const mintSession = async (uid: string, lifetimeSeconds: number = SESSION_LIFETIME_SECONDS) => {
    const { sid, token } = await issueSession(uid, await activeTenant(), lifetimeSeconds);
    seededRows.push(await SessionEntity.findOne({ where: { id: sid } }));
    return { sid, token };
};

const sessionRowsFor = async (uid: string) => await SessionEntity.findAll({ where: { userId: uid } });

/** The auth_token Set-Cookie line, isolated from the hint cookies. */
const authCookieOf = (res: any): string =>
    (res.headers.get("set-cookie") ?? "").split(", ").find(part => part.startsWith("auth_token=")) ?? "";

const bearer = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

const activeConnections = async (harness: any): Promise<number> => {
    const response = await harness.request("/ws/stats", await getAuthenticatedHeaders());
    expect(response.status).toBe(200);
    return JSON.parse(response.body).data.activeConnections;
};

const loginForm = (email: string): Record<string, any> => ({
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(email)}&password=${PASSWORD}`,
});

describe("Auth session policy", () => {
    test("profile PATCH cannot change login emails or let non-admins edit contacts", async () => {
        const user = await fixtureUser();
        const contact = await fixtureUser({ real: false });
        const { token } = await mintSession(String(user.get("id")));
        const originalEmail = String(user.get("email"));

        try {
            const response = await app.request(`/api/people/${user.get("id")}`, {
                method: "PATCH",
                headers: { ...bearer(token), "Content-Type": "application/json" },
                body: JSON.stringify({ email: "attacker-controlled@example.com" }),
            });

            expect(response.status).toBe(400);
            await user.reload();
            expect(user.get("email")).toBe(originalEmail);

            const contactResponse = await app.request(`/api/people/${contact.get("id")}`, {
                method: "PATCH",
                headers: { ...bearer(token), "Content-Type": "application/json" },
                body: JSON.stringify({ email: "directory-contact@example.com" }),
            });
            expect(contactResponse.status).toBe(404);
            await contact.reload();
            expect(contact.get("email")).not.toBe("directory-contact@example.com");
        } finally {
            await cleanupSeededRows();
        }
    });

    test("email-change requests have an account-level delivery budget", async () => {
        const user = await fixtureUser();
        const { token } = await mintSession(String(user.get("id")));
        const headers = { ...bearer(token), "Content-Type": "application/json" };

        try {
            const results = await Promise.all(
                [1, 2, 3, 4].map(index =>
                    app.request(`/api/people/${user.get("id")}/email-change`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ email: `budget-${index}-${randomUUID()}@example.com` }),
                    })
                )
            );
            expect(results.map(response => response.status).sort()).toEqual([202, 202, 202, 429]);

            const queued = await EmailQueueEntity.findAll({ where: { userId: user.get("id") } });
            queued.forEach(row => seededRows.push(row));
            expect(queued.filter(row => row.get("template") === "email-change")).toHaveLength(3);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("a login email changes only after a one-time link is confirmed", async () => {
        const user = await fixtureUser();
        const { sid, token } = await mintSession(String(user.get("id")));
        const newEmail = `verified-${randomUUID()}@example.com`;
        let emailJob: any;
        const headers = { ...bearer(token), "Content-Type": "application/json" };

        try {
            const requested = await app.request(`/api/people/${user.get("id")}/email-change`, {
                method: "POST",
                headers,
                body: JSON.stringify({ email: newEmail }),
            });
            expect(requested.status).toBe(202);
            await user.reload();
            expect(user.get("email")).not.toBe(newEmail);

            emailJob = await EmailQueueEntity.findOne({
                where: { userId: user.get("id"), template: "email-change" },
                order: [["created", "DESC"]],
            });
            expect(emailJob).not.toBeNull();
            seededRows.push(emailJob);
            expect(emailJob.get("recipientEmail")).toBe(newEmail);
            const verificationToken = emailJob.get("data").verificationLink.split("/").pop();
            expect(verificationToken).toMatch(/^[0-9a-f]{64}$/);
            expect(user.get("emailChangeTokenHash")).not.toBe(verificationToken);
            expect(user.get("emailChangeTokenHash")).toMatch(/^[0-9a-f]{64}$/);
            expect(user.get("emailChangeTokenExpiresAt").getTime()).toBeGreaterThan(Date.now());

            const page = await app.request(`/auth/email-change/${verificationToken}`);
            expect(page.status).toBe(200);
            const pageHtml = await page.text();
            const csrf = pageHtml.match(/name="csrf" value="([^"]+)"/)?.[1];
            expect(csrf).toBeTruthy();
            const cookie = page.headers.get("set-cookie")?.split(";")[0];
            expect(cookie).toBeTruthy();

            const missingCsrf = await app.request("/auth/email-change/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: cookie!,
                },
                body: new URLSearchParams({ token: verificationToken }).toString(),
            });
            expect(missingCsrf.status).toBe(403);

            const confirmed = await app.request("/auth/email-change/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: cookie!,
                },
                body: new URLSearchParams({ csrf: csrf!, token: verificationToken }).toString(),
            });
            expect(confirmed.status).toBe(200);
            await user.reload();
            expect(user.get("email")).toBe(newEmail);
            expect(user.get("pendingEmail")).toBeNull();
            expect(user.get("emailChangeTokenHash")).toBeNull();
            expect(await sessionStillValid(sid, String(user.get("id")))).toBe(false);

            const replayed = await app.request("/auth/email-change/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: cookie!,
                },
                body: new URLSearchParams({ csrf: csrf!, token: verificationToken }).toString(),
            });
            expect(await replayed.text()).toContain("Verification failed");
            await user.reload();
            expect(user.get("email")).toBe(newEmail);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("email-change requests are self-only and expired links cannot be redeemed", async () => {
        const user = await fixtureUser();
        const otherUser = await fixtureUser();
        const { token } = await mintSession(String(user.get("id")));
        const newEmail = `expired-${randomUUID()}@example.com`;
        const headers = { ...bearer(token), "Content-Type": "application/json" };

        try {
            const foreignRequest = await app.request(`/api/people/${otherUser.get("id")}/email-change`, {
                method: "POST",
                headers,
                body: JSON.stringify({ email: newEmail }),
            });
            expect(foreignRequest.status).toBe(403);

            const requested = await app.request(`/api/people/${user.get("id")}/email-change`, {
                method: "POST",
                headers,
                body: JSON.stringify({ email: newEmail }),
            });
            expect(requested.status).toBe(202);
            await user.reload();
            user.set("emailChangeTokenExpiresAt", new Date(Date.now() - 1_000));
            await user.save();

            const emailJob = await EmailQueueEntity.findOne({
                where: { userId: user.get("id"), template: "email-change" },
                order: [["created", "DESC"]],
            });
            seededRows.push(emailJob);
            const verificationToken = emailJob.get("data").verificationLink.split("/").pop();
            const response = await app.request(`/auth/email-change/${verificationToken}`);
            expect(await response.text()).toContain("Verification failed");
            await user.reload();
            expect(user.get("email")).not.toBe(newEmail);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("the HTML login form issues one bounded session row", async () => {
        const user = await fixtureUser();
        const res = await app.request("/login", loginForm(String(user.get("email"))));
        try {
            expect(res.status).toBe(302);
            expect(res.headers.get("location")).toBe("/app");

            const cookie = authCookieOf(res);
            expect(cookie).not.toBe("");
            expect(cookie).toContain("HttpOnly");
            expect(cookie).toContain("SameSite=Lax");
            expect(cookie).toContain("Path=/");
            expect(cookie).not.toContain("Secure");

            const maxAge = Number(cookie.match(/Max-Age=(\d+)/)?.[1]);
            expect(Number.isFinite(maxAge)).toBe(true);
            expect(maxAge).toBeGreaterThan(0);
            expect(maxAge).toBeLessThanOrEqual(SESSION_LIFETIME_SECONDS);

            const rows = await sessionRowsFor(String(user.get("id")));
            rows.forEach(row => seededRows.push(row));
            expect(rows).toHaveLength(1);
            const row = rows[0];
            expect(row.get("revokedAt")).toBeNull();
            expect(
                Math.abs(row.get("expiresAt").getTime() - (Date.now() + SESSION_LIFETIME_SECONDS * 1000))
            ).toBeLessThan(60_000);
            expect(await sessionStillValid(String(row.get("id")), String(user.get("id")))).toBe(true);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("the auth cookie is Secure only for a proxied HTTPS origin", async () => {
        const user = await fixtureUser();
        const email = String(user.get("email"));
        try {
            const plain = await app.request("/login", loginForm(email));
            expect(authCookieOf(plain)).not.toContain("Secure");

            const proxied = await app.request("/login", {
                ...loginForm(email),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-forwarded-proto": "https",
                },
            });
            expect(proxied.status).toBe(302);
            const cookie = authCookieOf(proxied);
            expect(cookie).toContain("Secure");
            expect(cookie).toContain("HttpOnly");
            expect(cookie).toContain("SameSite=Lax");

            const rows = await sessionRowsFor(String(user.get("id")));
            rows.forEach(row => seededRows.push(row));
            expect(rows).toHaveLength(2);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("the JSON login keeps its payload and issues session-bound claims", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const res = await app.request("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: String(user.get("email")), password: PASSWORD }),
            });
            expect(res.status).toBe(200);
            expect(res.headers.get("cache-control")).toBe("private, no-store");
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data.token).toBeTruthy();
            expect(body.data.user).toBe(uid);

            const claims = tokenClaims(String(body.data.token));
            expect(claims).not.toBeNull();
            expect(claims.uid).toBe(uid);
            expect(claims.iss).toBe(SESSION_ISSUER);
            expect(claims.aud).toBe(SESSION_AUDIENCE);
            expect(typeof claims.sid).toBe("string");
            expect(typeof claims.exp).toBe("number");

            const rows = await sessionRowsFor(uid);
            rows.forEach(row => seededRows.push(row));
            expect(rows).toHaveLength(1);
            expect(await sessionStillValid(String(rows[0].get("id")), uid)).toBe(true);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("a revoked session is refused on the API and MCP transports", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const { sid, token } = await mintSession(uid, 600);
            const headers = bearer(token);
            const mcpCall = {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                },
                body: JSON.stringify({ jsonrpc: "2.0", id: "probe", method: "initialize", params: {} }),
            };

            const boot = await app.request("/api/boot", { headers });
            expect(boot.status).toBe(200);
            expect(boot.headers.get("cache-control")).toBe("private, no-store");
            expect((await app.request("/api/mcp", mcpCall)).status).toBe(200);

            expect(await revokeSession(sid)).toBe(true);

            const replay = await app.request("/api/boot", { headers });
            expect(replay.status).toBe(401);
            expect(await replay.text()).toContain(translate("Session was revoked"));
            expect((await app.request("/api/mcp", mcpCall)).status).toBe(401);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("personalized people responses stay private on internal cache hits", async () => {
        const previousCache = process.env.CACHE;
        process.env.CACHE = "true";
        const user = await fixtureUser();
        try {
            const { token } = await mintSession(String(user.get("id")), 600);
            const headers = bearer(token);
            const miss = await app.request("/api/people", { headers });
            const hit = await app.request("/api/people", { headers });

            expect(miss.status).toBe(200);
            expect(hit.status).toBe(200);
            expect(miss.headers.get("cache-control")).toBe("private, no-store");
            expect(hit.headers.get("cache-control")).toBe("private, no-store");
            expect(miss.headers.get("x-cache")).toBe("MISS");
            expect(hit.headers.get("x-cache")).toBe("HIT");
        } finally {
            cacheInstances.api.clear();
            if (previousCache === undefined) delete process.env.CACHE;
            else process.env.CACHE = previousCache;
            await cleanupSeededRows();
        }
    });

    test("a live socket is closed once its session is revoked", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        const harness = await startSocketHarness();
        const before = await activeConnections(harness);
        try {
            const { sid, token } = await mintSession(uid, 600);
            const { opened, client, closeCodes } = await harness.openClient(bearer(token), { origin: false });
            expect(opened).toBe(true);

            expect(await revokeSession(sid)).toBe(true);
            client.send(JSON.stringify({ type: "ping", messageId: randomUUID() }));

            expect(await harness.waitFor(async () => closeCodes.includes(1008))).toBe(true);
            expect(await activeConnections(harness)).toBe(before);
        } finally {
            await harness.close();
            await cleanupSeededRows();
        }
    });

    test("a legacy token without issuer or audience is refused even with a live row", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const { sid } = await mintSession(uid, 600);
            const legacy = await sign({ uid, sid, exp: Math.floor(Date.now() / 1000) + 600 }, getJwtSecret());
            const res = await app.request("/api/boot", { headers: bearer(legacy) });
            expect(res.status).toBe(401);
            expect(await res.text()).toContain(translate("Invalid authentication token"));
        } finally {
            await cleanupSeededRows();
        }
    });

    test("a token that omits exp is refused even with a live row", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const { sid } = await mintSession(uid, 600);
            const noExpiry = await sign(
                {
                    uid,
                    sid,
                    iat: Math.floor(Date.now() / 1000),
                    iss: SESSION_ISSUER,
                    aud: SESSION_AUDIENCE,
                },
                getJwtSecret()
            );
            const res = await app.request("/api/boot", { headers: bearer(noExpiry) });
            expect(res.status).toBe(401);
            expect(await res.text()).toContain(translate("Invalid authentication token"));
        } finally {
            await cleanupSeededRows();
        }
    });

    test("a past-expiry token is refused before its session is consulted", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const logWarning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
            const { token } = await mintSession(uid, -60);
            const res = await app.request("/api/boot", { headers: bearer(token) });
            expect(res.status).toBe(401);
            expect(await res.text()).toContain(translate("Token expired"));
            expect(logError.mock.calls.flat().join(" ")).not.toContain(token);
            expect(logWarning.mock.calls.flat().join(" ")).not.toContain(token);
        } finally {
            logError.mockRestore();
            logWarning.mockRestore();
            await cleanupSeededRows();
        }
    });

    test("a disabled account is refused while its session is still live", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const { token } = await mintSession(uid, 600);
            await UserEntity.update({ disabled: true }, { where: { id: uid }, returning: false });

            const res = await app.request("/api/boot", { headers: bearer(token) });
            expect(res.status).toBe(302);
            const location = String(res.headers.get("location"));
            expect(location).toContain("/login?e=");
            expect(Buffer.from(location.split("?e=")[1], "base64").toString()).toBe(
                translate("User disabled")
            );

            const rows = await sessionRowsFor(uid);
            rows.forEach(row => seededRows.push(row));
            expect(rows).toHaveLength(1);
            expect(await sessionStillValid(String(rows[0].get("id")), uid)).toBe(true);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("the SPA entry and routes re-check a user's active account state", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const { token } = await mintSession(uid, 600);
            const headers = bearer(token);

            // This checkout has no production SPA bundle, so a live account reaches the expected 404.
            expect((await app.request("/app", { headers })).status).toBe(404);

            await UserEntity.update({ disabled: true }, { where: { id: uid }, returning: false });

            for (const path of ["/app", "/app/projects"] as const) {
                const response = await app.request(path, { headers });
                expect(response.status).toBe(302);
                expect(response.headers.get("location")).toContain("/login?e=");
                expect(
                    Buffer.from(response.headers.get("location")!.split("?e=")[1], "base64").toString()
                ).toBe(translate("User disabled"));
            }
        } finally {
            await cleanupSeededRows();
        }
    });

    test("the SPA entry refuses a session after its tenant is disabled", async () => {
        const existingTenant = await activeTenant();
        const role = await RoleEntity.findOne({ where: { title: "User", tenant: existingTenant } });
        const tenant = await TenantEntity.create({
            title: `T05 static disabled ${randomUUID()}`,
            description: "temporary fixture",
            disabled: false,
            expiry: new Date(Date.now() + 60 * 60 * 1000),
        });
        seededRows.push(tenant);
        const user = await fixtureUser({ tenant: String(tenant.get("id")), role: role.get("id") });
        const uid = String(user.get("id"));
        try {
            const { sid, token } = await issueSession(uid, String(tenant.get("id")), 600);
            seededRows.push(await SessionEntity.findOne({ where: { id: sid } }));
            const headers = bearer(token);
            expect((await app.request("/app", { headers })).status).toBe(404);

            await TenantEntity.update(
                { disabled: true },
                { where: { id: tenant.get("id") }, returning: false }
            );

            const response = await app.request("/app", { headers });
            expect(response.status).toBe(302);
            const location = String(response.headers.get("location"));
            expect(Buffer.from(location.split("?e=")[1], "base64").toString()).toBe(
                translate("Tenant disabled")
            );
        } finally {
            await cleanupSeededRows();
        }
    });

    test("an API logout needs no browser guard and revokes the session", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const { sid, token } = await mintSession(uid, 600);
            const headers = bearer(token);

            const logout = await app.request("/auth/logout", { method: "POST", headers });
            expect(logout.status).toBe(200);
            const body = await logout.json();
            expect(body.success).toBe(true);
            expect(body.data.revoked).toBe(true);

            const replay = await app.request("/api/boot", { headers });
            expect(replay.status).toBe(401);
            expect(await replay.text()).toContain(translate("Session was revoked"));
            expect(await sessionStillValid(sid, uid)).toBe(false);
        } finally {
            await cleanupSeededRows();
        }
    });

    test("logout-all revokes every live session of the account", async () => {
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        try {
            const tokens = [];
            for (let index = 0; index < 3; index += 1) {
                tokens.push((await mintSession(uid, 600)).token);
            }
            const before = await sessionRowsFor(uid);
            expect(before).toHaveLength(3);

            const res = await app.request("/auth/logout-all", {
                method: "POST",
                headers: bearer(tokens[0]),
            });
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.data.revoked).toBe(3);

            const rows = await sessionRowsFor(uid);
            rows.forEach(row => seededRows.push(row));
            rows.forEach(row => expect(row.get("revokedAt")).not.toBeNull());
            for (const token of tokens) {
                const replay = await app.request("/api/boot", { headers: bearer(token) });
                expect(replay.status).toBe(401);
            }
        } finally {
            await cleanupSeededRows();
        }
    });

    test("a password reset revokes sessions in the same write as the new password", async () => {
        const previous = process.env.PASSWORD_RECOVERY_ENABLED;
        process.env.PASSWORD_RECOVERY_ENABLED = "true";
        const user = await fixtureUser();
        const uid = String(user.get("id"));
        const reset = createPasswordResetToken();
        user.set("passwordResetTokenHash", reset.hash);
        user.set("passwordResetTokenExpiresAt", reset.expiresAt);
        await user.save();
        try {
            const tokens = [(await mintSession(uid, 600)).token, (await mintSession(uid, 600)).token];
            const seeded = await UserEntity.findOne({ where: { id: uid } });
            expect(seeded.get("passwordResetTokenHash")).toBe(hashAccountToken(reset.token));

            const resetForm = {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `token=${reset.token}&password1=rotated-password&password2=rotated-password`,
            };
            const res = await app.request("/login/password-reset", resetForm);
            expect(res.status).toBe(302);

            const updated = await UserEntity.findOne({ where: { id: uid } });
            expect(String(updated.get("password"))).not.toBe(String(user.get("password")));
            expect(updated.get("passwordResetTokenHash")).toBeNull();
            expect(updated.get("passwordResetTokenExpiresAt")).toBeNull();

            const rows = await sessionRowsFor(uid);
            rows.forEach(row => seededRows.push(row));
            expect(rows).toHaveLength(2);
            rows.forEach(row => expect(row.get("revokedAt")).not.toBeNull());
            for (const token of tokens) {
                expect((await app.request("/api/boot", { headers: bearer(token) })).status).toBe(401);
            }
            expect((await app.request("/login/password-reset", resetForm)).status).toBe(400);
        } finally {
            if (previous === undefined) {
                delete process.env.PASSWORD_RECOVERY_ENABLED;
            } else {
                process.env.PASSWORD_RECOVERY_ENABLED = previous;
            }
            await cleanupSeededRows();
        }
    });
});
