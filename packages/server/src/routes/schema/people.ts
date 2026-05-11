// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * People directory filters and profile PATCH fields.
 */
import { z } from "zod/v4";

/** Query for birthday lists (day/week/month span). */
export const BirthdaysFilteredSchema = z
    .object({
        span: z.enum(["day", "week", "month"]).optional(),
        date: z.string().optional(),
    })
    .strict();

/** Partial person profile update from directory or person view. */
export const PeopleUpdateSchema = z.object({
    email: z.email().optional(),
    avatar: z.union([z.string(), z.null()]).optional(),
    firstName: z.union([z.string(), z.null()]).optional(),
    lastName: z.union([z.string(), z.null()]).optional(),
    gender: z.union([z.string(), z.null()]).optional(),
    nickname: z.union([z.string(), z.null()]).optional(),
    title: z.union([z.string(), z.null()]).optional(),
    jobTitle: z.union([z.string(), z.null()]).optional(),
    company: z.union([z.uuid(), z.null()]).optional(),
    officePhone: z.union([z.string(), z.null()]).optional(),
    cellPhone: z.union([z.string(), z.null()]).optional(),
    homePhone: z.union([z.string(), z.null()]).optional(),
    fax: z.union([z.string(), z.null()]).optional(),
    address: z.union([z.string(), z.null()]).optional(),
    county: z.union([z.string(), z.null()]).optional(),
    zip: z.union([z.string(), z.null()]).optional(),
    city: z.union([z.string(), z.null()]).optional(),
    country: z.union([z.string(), z.null()]).optional(),
    address2: z.union([z.string(), z.null()]).optional(),
    website: z.union([z.string(), z.null()]).optional(),
    notes: z.union([z.string(), z.null()]).optional(),
    socialTwitter: z.union([z.string(), z.null()]).optional(),
    socialFacebook: z.union([z.string(), z.null()]).optional(),
    socialLinkedin: z.union([z.string(), z.null()]).optional(),
    socialInstagram: z.union([z.string(), z.null()]).optional(),
    socialOther: z.union([z.string(), z.null()]).optional(),
    personalId: z.union([z.string(), z.null()]).optional(),
    userId: z.union([z.string(), z.null()]).optional(),
    tags: z.union([z.json(), z.null()]).optional(),
    status: z.union([z.string(), z.null()]).optional(),
    birthday: z.union([z.iso.datetime(), z.null()]).optional(),
    hourlyRates: z.union([z.json(), z.null()]).optional(),
    role: z.uuid().optional(),
});
