// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T08: exact-origin policy and the browser CSRF token.
 *
 * A browser is handed a nonce in a signed HttpOnly cookie and must return the
 * HMAC of that nonce; an HTML form cannot read the cookie, so presenting the
 * token proves same-site intent. The `Origin` header is checked only when it is
 * present and only against the exact configured set — a prefix or suffix match
 * would let `http://localhost:3000.attacker.test` in. A bearer token is not a
 * browser transport, so API clients are exempt, and a request carrying no
 * browser cookie at all is a native client with nothing to bind.
 */
import { afterAll, afterEach, describe, expect, test } from "vitest";
import app from "../../src/index";
import { translate } from "@stacks/translations";
import { getAuthenticatedHeaders } from "../helpers/authHelper";
import { BROWSER_NONCE_COOKIE, CSRF_FORM_FIELD, CSRF_TOKEN_HEADER } from "../../src/config/browserCsrf";
import { getTrustedOrigins } from "../../src/config/origins";
import { RoleEntity, SessionEntity, TagEntity, TenantEntity, UserEntity } from "@stacks/db";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";

const PASSWORD = "testpassword123";
const TAG_TITLE = "t08-" + randomUUID();
const CSRF_REJECTED = translate("Cross site request rejected");

/** Rows seeded by these tests; hard-deleted by cleanupSeededRows so fixtures never leak. */
const fixtureUserIds: string[] = [];

const cleanupSeededRows = async (): Promise<void> => {
    if (fixtureUserIds.length > 0) {
        try {
            await TagEntity.destroy({ where: { title: TAG_TITLE }, force: true });
            await SessionEntity.destroy({ where: { userId: fixtureUserIds }, force: true });
            await UserEntity.destroy({ where: { id: fixtureUserIds }, force: true });
        } catch (error) {
            console.warn("T08 fixture cleanup failed:", error);
        }
        fixtureUserIds.length = 0;
    }
};

const activeTenant = async (): Promise<string> => {
    const tenant = await TenantEntity.findOne({ where: {} });
    return String(tenant.get("id"));
};

/** A fixture account that can complete the browser login flows. */
const fixtureUser = async (label: string) => {
    const tenant = await activeTenant();
    const role = await RoleEntity.findOne({
        where: { description: "Integration test role with project settings access", tenant },
    });
    expect(role).not.toBeNull();
    const user = await UserEntity.create({
        email: `t08-${label}-${randomUUID()}@example.com`,
        password: await hash(PASSWORD, 10),
        firstName: "Origin",
        lastName: "Fixture",
        real: true,
        tenant,
        role: role.get("id"),
    });
    fixtureUserIds.push(String(user.get("id")));
    return user;
};

/** Splits a Set-Cookie list into name/value pairs, where an empty value deletes. */
const cookiePairs = async (response: any): Promise<Map<string, string>> => {
    const values = new Map<string, string>();
    for (const entry of response.headers.getSetCookie()) {
        const pair = entry.split(";")[0];
        const separator = pair.indexOf("=");
        if (separator === -1) {
            continue;
        }
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        if (value === "") {
            values.delete(name);
        } else {
            values.set(name, value);
        }
    }
    return values;
};

const joinCookies = (values: Map<string, string>): string =>
    [...values.entries()].map(([name, value]) => `${name}=${value}`).join("; ");

const cookieHeader = async (response: any): Promise<string> => joinCookies(await cookiePairs(response));

/** Takes the browser nonce from `override` and every other cookie from `base`. */
const cookiesWithNonce = async (base: string, override: any): Promise<string> => {
    const merged = new Map<string, string>();
    for (const part of base.split(";")) {
        const pair = part.trim();
        const separator = pair.indexOf("=");
        if (separator === -1) {
            continue;
        }
        merged.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    for (const [name, value] of await cookiePairs(override)) {
        if (name === BROWSER_NONCE_COOKIE) {
            merged.set(name, value);
        }
    }
    return joinCookies(merged);
};

/**
 * A real browser session: log in, then ask for the token the server handed out
 * for the nonce that login just set. Nothing here guesses at the nonce.
 */
const browserSession = async (label: string): Promise<{ cookies: string; token: string }> => {
    const user = await fixtureUser(label);
    const login = await app.request("/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: await formFields([
            ["email", String(user.get("email"))],
            ["password", PASSWORD],
        ]),
    });
    expect(login.status).toBe(302);
    expect(login.headers.get("location")).toBe("/app");
    const cookies = await cookieHeader(login);
    expect(cookies).toContain(BROWSER_NONCE_COOKIE);

    const issued = await app.request("/auth/csrf", { headers: { Cookie: cookies } });
    expect(issued.status).toBe(200);
    const token = String((await issued.json()).data.token);
    expect(token.length > 0).toBe(true);
    return { cookies, token };
};

const formFields = async (fields: [string, string][]): Promise<string> =>
    fields.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&");

const tagPayload = (): string =>
    JSON.stringify({ title: TAG_TITLE, color: "#ff0000", section: "projects", type: "tag" });

const tagRows = async (): Promise<number> => Number(await TagEntity.count({ where: { title: TAG_TITLE } }));

const mutationRejected = async (response: any): Promise<boolean> =>
    response.status === 403 && (await response.text()).includes(CSRF_REJECTED);

const multipartBody = (fields: [string, string][]): { body: string; boundary: string } => {
    const boundary = "t08boundary";
    let body = "";
    for (const [name, value] of fields) {
        body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
    }
    return { body: body + `--${boundary}--\r\n`, boundary };
};

describe("Browser CSRF — origin policy", () => {
    afterEach(async () => {
        await cleanupSeededRows();
    });

    test("a token bound to the signed nonce cookie authorizes a mutation", async () => {
        const trusted = [...getTrustedOrigins()];
        expect(trusted.length > 0).toBe(true);
        const session = await browserSession("authorizes");

        const allowed = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                Origin: trusted[0],
                [CSRF_TOKEN_HEADER]: session.token,
            },
            body: tagPayload(),
        });
        expect(allowed.status).toBe(200);
        expect(await tagRows()).toBe(1);
    });

    test("an untrusted Origin is rejected even when the token is valid", async () => {
        const session = await browserSession("untrusted-origin");
        const rejected = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                Origin: "http://attacker.test",
                [CSRF_TOKEN_HEADER]: session.token,
            },
            body: tagPayload(),
        });
        expect(await mutationRejected(rejected)).toBe(true);
        expect(await tagRows()).toBe(0);
    });

    test("origin matching is exact, not a prefix or suffix match", async () => {
        const trusted = [...getTrustedOrigins()];
        const own = trusted[0];
        const session = await browserSession("spoofed-origin");

        for (const spoofed of [
            `${own}.attacker.test`,
            `${own}/evil`,
            `${own}evil`,
            "http://localhost:3001",
        ]) {
            expect(getTrustedOrigins().has(spoofed)).toBe(false);
            const rejected = await app.request("/api/tags", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: session.cookies,
                    Origin: spoofed,
                    [CSRF_TOKEN_HEADER]: session.token,
                },
                body: tagPayload(),
            });
            expect(await mutationRejected(rejected)).toBe(true);
        }
        expect(await tagRows()).toBe(0);
    });

    test("an opaque Origin authorizes only with a valid nonce-bound token", async () => {
        const session = await browserSession("null-origin");
        const allowed = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                Origin: "null",
                [CSRF_TOKEN_HEADER]: session.token,
            },
            body: tagPayload(),
        });
        expect(allowed.status).toBe(200);
        expect(await tagRows()).toBe(1);

        const rejected = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                Origin: "null",
            },
            body: JSON.stringify({
                title: `${TAG_TITLE}-without-token`,
                color: "#ff0000",
                section: "projects",
                type: "tag",
            }),
        });
        expect(await mutationRejected(rejected)).toBe(true);
        expect(await tagRows()).toBe(1);
    });

    test("an opaque-origin login without a browser nonce is rejected", async () => {
        const rejected = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Origin: "null",
            },
            body: await formFields([
                ["email", "opaque-origin@example.com"],
                ["password", PASSWORD],
            ]),
        });

        expect(await mutationRejected(rejected)).toBe(true);
    });

    test("a trusted Origin without the token does not authorize a mutation", async () => {
        const trusted = [...getTrustedOrigins()];
        const session = await browserSession("origin-only");

        const rejected = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                Origin: trusted[0],
            },
            body: tagPayload(),
        });
        expect(await mutationRejected(rejected)).toBe(true);
        expect(await tagRows()).toBe(0);
    });

    test("a CORS preflight is answered without authorizing the mutation", async () => {
        const trusted = [...getTrustedOrigins()];
        const session = await browserSession("preflight");

        const preflight = await app.request("/api/tags", {
            method: "OPTIONS",
            headers: {
                Origin: trusted[0],
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": CSRF_TOKEN_HEADER,
            },
        });
        expect(preflight.status).toBeLessThan(400);
        expect(preflight.headers.get("access-control-allow-origin")).toBe(trusted[0]);

        const mutation = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                Origin: trusted[0],
            },
            body: tagPayload(),
        });
        expect(await mutationRejected(mutation)).toBe(true);
        expect(await tagRows()).toBe(0);
    });

    test("a request with no browser cookie is not asked for a browser token", async () => {
        const native = await app.request("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: tagPayload(),
        });
        const body = await native.text();
        expect(body).not.toContain(CSRF_REJECTED);
        expect(native.status).toBe(401);
        expect(await tagRows()).toBe(0);
    });
});

describe("Browser CSRF — transport and body shape", () => {
    afterEach(async () => {
        await cleanupSeededRows();
    });

    test("bearer API clients are exempt from the browser gate", async () => {
        const bearer = await getAuthenticatedHeaders();
        const allowed = await app.request("/api/tags", {
            method: "POST",
            headers: { ...bearer, "Content-Type": "application/json", Origin: "http://attacker.test" },
            body: tagPayload(),
        });
        expect(allowed.status).toBe(200);
        expect(await tagRows()).toBe(1);
    });

    test("a form body carries the token in a hidden field", async () => {
        const session = await browserSession("form-field");
        const user = await fixtureUser("form-field-target");

        const urlencoded = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: session.cookies,
            },
            body: await formFields([
                ["email", String(user.get("email"))],
                ["password", PASSWORD],
                [CSRF_FORM_FIELD, session.token],
            ]),
        });
        expect(urlencoded.status).toBe(302);
        expect(urlencoded.headers.get("location")).toBe("/app");

        const form = multipartBody([
            ["email", String(user.get("email"))],
            ["password", PASSWORD],
            [CSRF_FORM_FIELD, session.token],
        ]);
        const multipart = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": `multipart/form-data; boundary=${form.boundary}`,
                Cookie: session.cookies,
            },
            body: form.body,
        });
        expect(multipart.status).toBe(302);
        expect(multipart.headers.get("location")).toBe("/app");
    });

    test("a form body without the hidden field is rejected", async () => {
        const session = await browserSession("missing-field");
        const user = await fixtureUser("missing-field-target");

        const rejected = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: session.cookies,
            },
            body: await formFields([
                ["email", String(user.get("email"))],
                ["password", PASSWORD],
            ]),
        });
        expect(await mutationRejected(rejected)).toBe(true);
    });

    test("a body that smuggles two token fields is rejected", async () => {
        const session = await browserSession("duplicate-field");
        const user = await fixtureUser("duplicate-field-target");

        const smuggled = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: session.cookies,
            },
            body: await formFields([
                ["email", String(user.get("email"))],
                ["password", PASSWORD],
                [CSRF_FORM_FIELD, session.token],
                [CSRF_FORM_FIELD, "forged"],
            ]),
        });
        expect(await mutationRejected(smuggled)).toBe(true);

        const headerSmuggled = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: session.cookies,
                [CSRF_TOKEN_HEADER]: session.token,
            },
            body: tagPayload(),
        });
        expect(headerSmuggled.status).toBe(200);
    });

    test("a token issued for another browser nonce is rejected", async () => {
        const first = await browserSession("first-nonce");
        const second = await browserSession("second-nonce");

        const crossed = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: first.cookies,
                [CSRF_TOKEN_HEADER]: second.token,
            },
            body: tagPayload(),
        });
        expect(await mutationRejected(crossed)).toBe(true);
        expect(await tagRows()).toBe(0);
    });

    test("logout rotates the nonce so an issued token stops working", async () => {
        const trusted = [...getTrustedOrigins()];
        const session = await browserSession("rotating");

        const logout = await app.request("/auth/logout", {
            method: "POST",
            headers: {
                Cookie: session.cookies,
                Origin: trusted[0],
                [CSRF_TOKEN_HEADER]: session.token,
            },
        });
        expect(logout.status).toBe(200);
        const rotated = await cookieHeader(logout);
        expect(rotated).toContain(BROWSER_NONCE_COOKIE);

        // The rotated nonce hands out a different token, and the old one no longer
        // matches it. A fresh session supplies the identity so the 403 below is the
        // CSRF rejection rather than a revoked-session 401.
        const fresh = await browserSession("after-logout");
        const replay = await app.request("/api/tags", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: await cookiesWithNonce(fresh.cookies, logout),
                Origin: trusted[0],
                [CSRF_TOKEN_HEADER]: session.token,
            },
            body: tagPayload(),
        });
        expect(await mutationRejected(replay)).toBe(true);
        expect(await tagRows()).toBe(0);
    });

    test("the token issuance endpoint applies the same origin policy", async () => {
        const trusted = [...getTrustedOrigins()][0];
        const session = await browserSession("issuing");

        const issued = await app.request("/auth/csrf", {
            headers: { Cookie: session.cookies, Origin: trusted },
        });
        expect(issued.status).toBe(200);
        expect(issued.headers.get("cache-control")).toBe("private, no-store");

        const attacker = await app.request("/auth/csrf", {
            headers: { Cookie: session.cookies, Origin: trusted + "/attacker" },
        });
        expect(await mutationRejected(attacker)).toBe(true);

        // A native client has no Origin and nothing to bind, so it still gets a token.
        const native = await app.request("/auth/csrf");
        expect(native.status).toBe(200);
        expect(native.headers.get("cache-control")).toBe("private, no-store");
    });
});
