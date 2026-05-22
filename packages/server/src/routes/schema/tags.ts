// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tag create/update payload (projects, people, or timebox section).
 */
import { z } from "zod/v4";

/** Fields accepted when creating or updating a tag. */
export const TagSchema = z.object({
    title: z.string(),
    color: z.string(),
    section: z.enum(["projects", "people", "timebox"]),
    parent: z.union([z.uuid(), z.null()]).optional(),
    type: z.enum(["tag", "status"])
});