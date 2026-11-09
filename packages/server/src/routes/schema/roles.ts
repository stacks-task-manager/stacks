// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Role definition with nested section access (read/write flags per area).
 */
import { z } from "zod/v4";
import { ROLE_ACTIONS } from "@stacks/types";

const RoleActionSchema = z.partialRecord(z.enum(ROLE_ACTIONS), z.boolean());

const RoleAccessSchema = z.record(z.string(), RoleActionSchema);

/** Body for creating or updating a role and its access matrix. */
export const RoleSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    access: RoleAccessSchema,
    disabled: z.boolean().default(false).optional(),
});
