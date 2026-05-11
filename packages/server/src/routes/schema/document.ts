// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Document tree nodes: folders, notepads, projects, files.
 */
import { RECORDTYPE } from "@stacks/types";
import { z } from "zod/v4";
import { PermissionSchema } from "./permissions";

const DocumentBaseSchema = z.object({
    title: z.string(),
});

/** POST body when creating a document node under a parent. */
export const DocumentCreateSchema = DocumentBaseSchema.extend({
    parent: z.union([z.null(), z.string()]),
    type: z.enum([RECORDTYPE.FOLDER, RECORDTYPE.NOTEPAD, RECORDTYPE.PROJECT, RECORDTYPE.FILE]),
    data: z.json().optional(),
    permissions: PermissionSchema.default({
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
    }),
});

/** PATCH body for renaming, reordering, or moving a document. */
export const DocumentUpdateSchema = DocumentBaseSchema.extend({
    title: z.string().optional(),
    tint: z.string().optional(),
    order: z.number().min(0).optional(),
    parent: z.uuid().optional(),
});
