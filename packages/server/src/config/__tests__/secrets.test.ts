// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    assertProductionSecretsAtStartup,
    getCookieSecret,
    getJwtSecret,
    validateProductionSecrets,
} from "../secrets";

const strongSecrets = {
    JWT_SECRET: "jwt-secret-with-at-least-thirty-two-characters",
    COOKIE_SECRET: "cookie-secret-with-at-least-thirty-two-characters",
};
const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE_SECRETS: process.env.REQUIRE_SECRETS,
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
};

afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    vi.restoreAllMocks();
});

describe("production secret validation", () => {
    it("accepts distinct secrets with at least 32 UTF-8 bytes", () => {
        expect(validateProductionSecrets(strongSecrets)).toBeNull();
    });

    it.each([
        ["short JWT secret", { ...strongSecrets, JWT_SECRET: "x".repeat(31) }],
        ["short cookie secret", { ...strongSecrets, COOKIE_SECRET: "x".repeat(31) }],
        [
            "identical secrets",
            { JWT_SECRET: strongSecrets.JWT_SECRET, COOKIE_SECRET: strongSecrets.JWT_SECRET },
        ],
        ["repeated JWT secret", { ...strongSecrets, JWT_SECRET: "a".repeat(32) }],
        ["repeated cookie secret", { ...strongSecrets, COOKIE_SECRET: "b".repeat(32) }],
        ["repeated multibyte secret", { ...strongSecrets, JWT_SECRET: "🔒".repeat(8) }],
    ])("rejects %s", (_label, secrets) => {
        expect(validateProductionSecrets(secrets)).toEqual(expect.any(String));
    });

    it("counts UTF-8 bytes rather than JavaScript characters", () => {
        const secrets = {
            JWT_SECRET: "éa".repeat(16),
            COOKIE_SECRET: "密ab".repeat(7),
        };
        expect(validateProductionSecrets(secrets)).toBeNull();
    });

    it("refuses invalid production secrets at startup without printing their values", () => {
        process.env.NODE_ENV = "production";
        process.env.JWT_SECRET = "short-private-secret";
        process.env.COOKIE_SECRET = "another-short-private-secret";
        const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

        assertProductionSecretsAtStartup();

        expect(exit).toHaveBeenCalledWith(1);
        expect(log.mock.calls.flat().join(" ")).not.toContain("short-private-secret");
    });

    it("accepts valid production secrets and keeps development defaults limited to development", () => {
        process.env.NODE_ENV = "production";
        process.env.JWT_SECRET = strongSecrets.JWT_SECRET;
        process.env.COOKIE_SECRET = strongSecrets.COOKIE_SECRET;
        const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        assertProductionSecretsAtStartup();
        expect(exit).not.toHaveBeenCalled();
        expect(getJwtSecret()).toBe(strongSecrets.JWT_SECRET);

        process.env.NODE_ENV = "development";
        delete process.env.JWT_SECRET;
        delete process.env.COOKIE_SECRET;
        expect(getJwtSecret()).toBe("s3cr3t");
        expect(getCookieSecret()).toBe("s3cr3t");
    });

    it("skips startup enforcement in test mode even when the strict flag is set", () => {
        process.env.NODE_ENV = "test";
        process.env.REQUIRE_SECRETS = "1";
        const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);

        assertProductionSecretsAtStartup();

        expect(exit).not.toHaveBeenCalled();
    });
});
