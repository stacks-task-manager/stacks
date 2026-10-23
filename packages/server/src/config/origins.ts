// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Trusted browser origins. `APP_ORIGIN` plus `CORS_ORIGINS` are the deployment
 * knobs; the WebSocket upgrade guard, the CORS response, and the browser CSRF
 * gate all require an exact match against this set, and when neither is
 * configured only the server's own dev origin is trusted.
 */

/** A value is a usable origin only when it is a bare http(s) origin. */
function isHttpOrigin(value: string): boolean {
    if (!value) {
        return false;
    }
    try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return false;
        }
        return url.origin === value;
    } catch {
        return false;
    }
}

export function getTrustedOrigins(): Set<string> {
    const configured = [process.env.APP_ORIGIN, process.env.CORS_ORIGINS].join(",");
    const origins = configured
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);

    if (origins.length === 0) {
        origins.push(`http://localhost:${process.env.APP_PORT?.trim() || "3000"}`);
    }

    return new Set(origins);
}

export function isTrustedOrigin(origin?: string | null): boolean {
    if (!origin) {
        return false;
    }
    return getTrustedOrigins().has(origin.trim());
}

/**
 * What a deployment has configured wrong, so boot can refuse it. Production must
 * name its own origin and every `CORS_ORIGINS` entry must be a bare origin — a
 * wildcard would make a credentialed response ambiguous.
 */
export function originConfigurationProblems(env: NodeJS.ProcessEnv = process.env): string[] {
    const strict = env.NODE_ENV === "production" || env.REQUIRE_SECRETS === "1";
    const problems: string[] = [];

    const appOrigin = env.APP_ORIGIN?.trim() ?? "";
    if (strict && !isHttpOrigin(appOrigin)) {
        problems.push("APP_ORIGIN must be a valid http(s) origin when strict mode is on.");
    }

    for (const entry of (env.CORS_ORIGINS ?? "").split(",")) {
        const value = entry.trim();
        if (!value) {
            continue;
        }
        if (value === "*") {
            problems.push("CORS_ORIGINS must not contain a wildcard.");
        } else if (!isHttpOrigin(value)) {
            problems.push(`CORS_ORIGINS entry ${value} is not a bare http(s) origin.`);
        }
    }

    return problems;
}

/** Called from `index.ts` outside tests; a bad origin configuration never boots. */
export function assertOriginConfiguration(): void {
    if (process.env.NODE_ENV === "test") {
        return;
    }
    const problems = originConfigurationProblems();
    if (problems.length > 0) {
        console.error("\u{1f6a8}", problems.join(" "));
        process.exit(1);
    }
}
