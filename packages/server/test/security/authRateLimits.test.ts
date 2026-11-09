// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimitCounterEntity, sequelize, UserEntity } from "@stacks/db";
import { getCookieSecret } from "../../src/config/secrets";
import app from "../../src/index";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";

const ip = "203.0.113.55";
const counterKeys = new Set<string>();
counterKeys.add(rateLimitKeyHash("unauthenticated-api-ip", ip, getCookieSecret()));
const envNames = ["PASSWORD_RECOVERY_ENABLED", "REGISTRATION_ENABLED", "RATE_LIMIT_LOGIN_IP_MAX"];
const originalEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));

const track = (scope: string, subject: string) => {
    counterKeys.add(rateLimitKeyHash(scope, subject, getCookieSecret()));
};

const sendLogin = (email: string, clientIp = ip) =>
    app.request(
        "/auth/login",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: "incorrect" }),
        },
        { incoming: { socket: { remoteAddress: clientIp } } }
    );

const sendForm = (path: string, values: Record<string, string>, clientIp = ip) =>
    app.request(
        path,
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(values),
        },
        { incoming: { socket: { remoteAddress: clientIp } } }
    );

afterEach(async () => {
    vi.restoreAllMocks();
    for (const name of envNames) {
        const value = originalEnv[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    }
    if (counterKeys.size > 0) {
        await RateLimitCounterEntity.destroy({ where: { keyHash: [...counterKeys] } });
        counterKeys.clear();
    }
});

describe("public authentication rate limits", () => {
    it("blocks the 11th login attempt before looking up the account with a generic 429", async () => {
        const email = `rate-limit-${crypto.randomUUID()}@example.test`;
        track("login-account", email.toLowerCase());
        track("login-ip", ip);
        const findUser = vi.spyOn(UserEntity, "findOne");

        for (let attempt = 0; attempt < 10; attempt++) {
            expect((await sendLogin(email)).status).toBe(401);
        }
        const limited = await sendLogin(email);

        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
        expect(await limited.json()).toEqual({ error: "Too many requests" });
        expect(findUser).toHaveBeenCalledTimes(10);
    });

    it("applies the IP budget across different account names", async () => {
        process.env.RATE_LIMIT_LOGIN_IP_MAX = "1";
        const firstEmail = `first-${crypto.randomUUID()}@example.test`;
        const secondEmail = `second-${crypto.randomUUID()}@example.test`;
        track("login-account", firstEmail.toLowerCase());
        track("login-account", secondEmail.toLowerCase());
        track("login-ip", ip);
        const findUser = vi.spyOn(UserEntity, "findOne");

        expect((await sendLogin(firstEmail)).status).toBe(401);
        const limited = await sendLogin(secondEmail);

        expect(limited.status).toBe(429);
        expect(findUser).toHaveBeenCalledTimes(1);
    });

    it("limits recovery attempts before account lookup and email enqueue", async () => {
        process.env.PASSWORD_RECOVERY_ENABLED = "true";
        const email = `recover-${crypto.randomUUID()}@example.test`;
        track("recovery-account", email.toLowerCase());
        track("recovery-ip", ip);
        const findUser = vi.spyOn(UserEntity, "findOne");

        for (let attempt = 0; attempt < 5; attempt++) {
            expect((await sendForm("/login/password-recovery", { email })).status).toBe(302);
        }
        const limited = await sendForm("/login/password-recovery", { email });

        expect(limited.status).toBe(429);
        expect(await limited.json()).toEqual({ error: "Too many requests" });
        expect(findUser).toHaveBeenCalledTimes(5);
    });

    it.each(["JSON", "HTML"])("limits %s registration before account lookup", async transport => {
        process.env.REGISTRATION_ENABLED = "true";
        const existingUser = await UserEntity.findOne({ where: { email: "cris@stacks.rocks" } });
        expect(existingUser).not.toBeNull();
        const email = String(existingUser!.get("email"));
        const tenant = String(existingUser!.get("tenant"));
        track("registration-account", `${tenant}:${email}`.toLowerCase());
        track("registration-ip", ip);
        const findUser = vi.spyOn(UserEntity, "findOne");
        const send = () => {
            const values = {
                email,
                password: "a-valid-test-password",
                tenant,
                firstName: "Rate",
                lastName: "Limit",
            };
            return transport === "JSON"
                ? app.request(
                      "/auth/register",
                      {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(values),
                      },
                      { incoming: { socket: { remoteAddress: ip } } }
                  )
                : sendForm("/register", values);
        };

        for (let attempt = 0; attempt < 5; attempt++) {
            expect((await send()).status).toBe(409);
        }
        const limited = await send();

        expect(limited.status).toBe(429);
        expect(await limited.json()).toEqual({ error: "Too many requests" });
        expect(findUser).toHaveBeenCalledTimes(5);
    });

    it("fails closed with a generic 503 when the shared counter store is unavailable", async () => {
        const email = `unavailable-${crypto.randomUUID()}@example.test`;
        const findUser = vi.spyOn(UserEntity, "findOne");
        vi.spyOn(sequelize, "query").mockRejectedValue(new Error("private database details"));

        const response = await sendLogin(email);

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ error: "Request temporarily unavailable" });
        expect(findUser).not.toHaveBeenCalled();
    });
});
