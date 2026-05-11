// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Admin-only user and role management request bodies.
 */
import { z } from "zod";

/** PATCH payload assigning a user to a role. */
export const UpdateUserRoleSchema = z.object({
    roleId: z.string().uuid("Role ID must be a valid UUID")
});

/** Full profile fields for provisioning a workspace user. */
export const CreateUserSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.string().uuid("Role ID must be a valid UUID"),
    gender: z.enum(["male", "female", "other"]).default("other"),
    nickname: z.string().optional(),
    title: z.string().optional(),
    jobTitle: z.string().optional(),
    officePhone: z.string().optional(),
    cellPhone: z.string().optional(),
    homePhone: z.string().optional(),
    fax: z.string().optional(),
    address: z.string().optional(),
    county: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    address2: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    notes: z.string().optional(),
    socialTwitter: z.string().optional(),
    socialFacebook: z.string().optional(),
    socialLinkedin: z.string().optional(),
    socialInstagram: z.string().optional(),
    socialOther: z.string().optional(),
    personalId: z.string().optional(),
    userId: z.string().optional(),
    tags: z.array(z.string()).default([]),
    status: z.string().optional(),
    birthday: z.string().datetime().optional()
});

/** Partial role update from the admin UI. */
export const UpdateRoleSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().optional(),
    admin: z.boolean().optional(),
    disabled: z.boolean().optional()
});

/** New custom role definition with default flags. */
export const CreateRoleSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    admin: z.boolean().default(false),
    disabled: z.boolean().default(false)
});