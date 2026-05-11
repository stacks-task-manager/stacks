// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Document visibility: public flag, owner, and audience lists.
 */
import z from "zod/v4";

/** Sharing ACL embedded on document create/update payloads. */
export const PermissionSchema = z.object({
    isPublic: z.boolean().optional().default(true),
    owner: z.uuid().optional(),
    visibleUsers: z.string().optional().array().default([]),
    visibleRoles: z.string().optional().array().default([]),
});
