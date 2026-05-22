// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Role definition with nested section access (create/view flags per area).
 */
import { z } from "zod/v4";

const RoleActionSchema = z.record(z.enum(["create", "view"]), z.boolean().optional());

const RoleAccessSchema = z.record(z.string(), RoleActionSchema);

/** Body for creating or updating a role and its access matrix. */
export const RoleSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    access: RoleAccessSchema,
    disabled: z.boolean().default(false).optional(),
});
