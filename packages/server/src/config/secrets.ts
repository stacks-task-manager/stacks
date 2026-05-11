// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Central secret handling: production enforcement and runtime getters.
 */

const WEAK_SECRETS = new Set(["s3cr3t", "your-very-secret-key"]);

function isWeak(value: string): boolean {
    return WEAK_SECRETS.has(value.trim());
}

function mustEnforceStrictSecrets(env: NodeJS.ProcessEnv): boolean {
    return env.NODE_ENV === "production" || env.REQUIRE_SECRETS === "1";
}

function allowsDevDefaults(env: NodeJS.ProcessEnv): boolean {
    return (
        env.NODE_ENV === "test" ||
        env.NODE_ENV === "development" ||
        env.NODE_ENV === undefined ||
        env.NODE_ENV === ""
    );
}

const DEV_FALLBACK = "s3cr3t";

/**
 * Validates env for production / REQUIRE_SECRETS. Returns an error message or null if OK.
 */
export function validateProductionSecrets(env: NodeJS.ProcessEnv = process.env): string | null {
    const jwt = env.JWT_SECRET?.trim() ?? "";
    const cookie = env.COOKIE_SECRET?.trim() ?? "";
    if (!jwt || !cookie) {
        return "JWT_SECRET and COOKIE_SECRET must be set and non-empty in production (or when REQUIRE_SECRETS=1).";
    }
    if (isWeak(jwt) || isWeak(cookie)) {
        return "JWT_SECRET and COOKIE_SECRET must not use default or placeholder values.";
    }
    return null;
}

/**
 * Call once at process startup (after integrity). Exits on failure in strict mode.
 */
export function assertProductionSecretsAtStartup(): void {
    if (process.env.NODE_ENV === "test") {
        return;
    }
    if (!mustEnforceStrictSecrets(process.env)) {
        return;
    }
    const msg = validateProductionSecrets();
    if (msg) {
        console.error("🚨", msg);
        process.exit(1);
    }
}

export function getJwtSecret(): string {
    const s = process.env.JWT_SECRET?.trim();
    if (allowsDevDefaults(process.env)) {
        return s || DEV_FALLBACK;
    }
    if (mustEnforceStrictSecrets(process.env)) {
        if (!s || isWeak(s)) {
            throw new Error("JWT_SECRET is missing or invalid; assertProductionSecretsAtStartup should run first.");
        }
        return s;
    }
    return s || DEV_FALLBACK;
}

export function getCookieSecret(): string {
    const s = process.env.COOKIE_SECRET?.trim();
    if (allowsDevDefaults(process.env)) {
        return s || DEV_FALLBACK;
    }
    if (mustEnforceStrictSecrets(process.env)) {
        if (!s || isWeak(s)) {
            throw new Error("COOKIE_SECRET is missing or invalid; assertProductionSecretsAtStartup should run first.");
        }
        return s;
    }
    return s || DEV_FALLBACK;
}
