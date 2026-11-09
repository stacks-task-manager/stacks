// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Keep route identity while removing bearer values from logs. */
export function redactLogPath(path: string): string {
    return path
        .split("?", 1)[0]
        .replace(/(\/auth\/activate\/)[^/]+/i, "$1[redacted]")
        .replace(/(\/auth\/email-change\/)[^/]+/i, "$1[redacted]")
        .replace(/(\/password-reset\/)[^/]+/i, "$1[redacted]");
}

export function redactLogText(text: string): string {
    return text
        .replace(
            /(authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|token|password|secret|api[_-]?key|client[_-]?secret|cookie|set-cookie)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
            "$1=[redacted]"
        )
        .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
        .replace(/([?&](?:code|state|token|secret|key)=)[^&#\s]+/gi, "$1[redacted]");
}

const SECRET_FIELD = /(?:token|secret|password|authorization|cookie|credential|api.?key|oauth.?code)/i;

/** Redact known credential keys before any configured log output sees metadata. */
export function redactLogMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    function redact(value: unknown, key: string, depth: number): unknown {
        if (SECRET_FIELD.test(key)) return "[redacted]";
        if (depth > 8) return "[truncated]";
        if (typeof value === "string") {
            if (key === "path") return redactLogPath(value);
            return redactLogText(value);
        }
        if (Array.isArray(value)) return value.slice(0, 100).map(item => redact(item, "", depth + 1));
        if (value && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value).map(([childKey, childValue]) => [
                    childKey,
                    redact(childValue, childKey, depth + 1),
                ])
            );
        }
        return value;
    }

    return redact(metadata, "", 0) as Record<string, unknown>;
}
