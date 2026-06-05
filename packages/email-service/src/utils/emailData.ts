// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Normalise the JSONB / string data column into a plain object.
 */
export function parseEmailData(data: string | Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (typeof data === "string") {
        try {
            return JSON.parse(data) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return data ?? {};
}
