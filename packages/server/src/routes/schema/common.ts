// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import z from "zod/v4";
import { translate } from "@stacks/translations";
import { Errors } from "../../errors";

/** Zod schema for a UUID string (any version accepted by Zod). */
export const uuidStringSchema = z.uuid();

/**
 * Parse and validate a UUID from route params or similar; throws on failure.
 */
export function parseUuidParam(id: string, messageKey = translate("Invalid ID format")): string {
    const r = uuidStringSchema.safeParse(id);
    if (!r.success) {
        throw Errors.badRequest(messageKey);
    }
    return r.data;
}

/** Parse a local UUID or the composite id used for Google Calendar events. */
export function parseEventIdParam(id: string): string {
    if (uuidStringSchema.safeParse(id).success) return id;

    if (id.startsWith("google_")) {
        const remainder = id.slice("google_".length);
        const separator = remainder.lastIndexOf("_");
        if (separator > 0 && separator < remainder.length - 1) return id;
    }

    throw Errors.badRequest(translate("Invalid ID format"));
}
