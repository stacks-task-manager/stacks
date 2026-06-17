// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: people directory search and profile updates.
 */
import { z } from "zod";
import { PeopleLoader, RolesLoader } from "../../loaders";
import { getCurrentUser } from "../../loaders/context";
import { defineTool } from "./defineTool";

async function roleIdToTitleMap(): Promise<Map<string, string>> {
    const roles = await RolesLoader.getAll();
    return new Map(roles.map(r => [r.id, r.title]));
}

/**
 * Separate from `defineTool` so we can reference the same shape in tests.
 * Requires at least one search axis to avoid accidental "list everyone" calls
 * on a vague turn — the refine runs after all optional fields are parsed.
 */
export const searchPeopleInput = z
    .object({
        query: z.string().min(1).optional().describe("Name or email substring (case-insensitive)."),
        jobTitle: z.string().min(1).optional().describe("Case-insensitive substring match on jobTitle."),
        company: z.string().min(1).optional().describe("Case-insensitive substring match on company."),
        city: z.string().min(1).optional().describe("Case-insensitive substring match on city."),
        country: z.string().min(1).optional().describe("Case-insensitive substring match on country."),
        roleTitle: z
            .string()
            .min(1)
            .optional()
            .describe("Case-insensitive substring match on workspace role title (e.g. 'Admin', 'Designer')."),
        hasEmail: z.boolean().optional().describe("true = only people with an email; false = only people without."),
        hasCellPhone: z
            .boolean()
            .optional()
            .describe("true = only people with a cell phone; false = only people without."),
        hasOfficePhone: z
            .boolean()
            .optional()
            .describe("true = only people with an office phone; false = only people without."),
        birthdayMonth: z
            .number()
            .int()
            .min(1)
            .max(12)
            .optional()
            .describe("Filter by birthday month (1 = January, 12 = December)."),
        includeDisabled: z
            .boolean()
            .optional()
            .describe("Include deactivated users (default: false)."),
        limit: z
            .number()
            .int()
            .positive()
            .max(200)
            .optional()
            .describe("Max people to return (default 50, max 200). `total` in the response reflects all matches."),
    })
    .refine(
        v =>
            v.query !== undefined ||
            v.jobTitle !== undefined ||
            v.company !== undefined ||
            v.city !== undefined ||
            v.country !== undefined ||
            v.roleTitle !== undefined ||
            v.hasEmail !== undefined ||
            v.hasCellPhone !== undefined ||
            v.hasOfficePhone !== undefined ||
            v.birthdayMonth !== undefined,
        {
            message:
                "Provide at least one filter (query, jobTitle, company, city, country, roleTitle, hasEmail, hasCellPhone, hasOfficePhone, or birthdayMonth).",
        }
    );

export type SearchPeopleInput = z.infer<typeof searchPeopleInput>;

/** People directory AI tools (`PeopleLoader`). */
export const peopleAiTools = [
    defineTool({
        name: "getPerson",
        description: `Load one person by user id. Use when a person id is in the UI block. Never pass a UUID to searchPeople.`,
        inputSchema: z.object({
            personId: z.string().min(1).describe("Person / user UUID"),
        }),
        execute: async ({ personId }) => {
            const p = await PeopleLoader.getOne(personId);
            const roleTitles = await roleIdToTitleMap();
            const roleTitle = p.role ? roleTitles.get(p.role) ?? null : null;
            return {
                firstName: p.firstName,
                lastName: p.lastName,
                email: p.email,
                nickname: p.nickname,
                gender: p.gender,
                jobTitle: p.jobTitle,
                company: p.company,
                officePhone: p.officePhone,
                cellPhone: p.cellPhone,
                city: p.city,
                country: p.country,
                notes: p.notes,
                roleTitle,
                birthday: p.birthday,
                disabled: p.disabled,
            };
        },
    }),

    defineTool({
        name: "openProfile",
        description: `Open a person's profile page in the app. Omit personId to open the current user's own profile ("my profile"). Returns a path the UI can navigate to.`,
        inputSchema: z.object({
            personId: z
                .string()
                .optional()
                .describe("Person UUID. Omit for the current user's own profile."),
        }),
        execute: async ({ personId }) => {
            const isSelf = !personId;
            const id = personId ?? getCurrentUser().id;
            return {
                personId: id,
                isSelf,
                hashPath: `/person/${id}`,
                label: isSelf ? "Open my profile" : "Open profile",
            };
        },
    }),

    defineTool({
        name: "searchPeople",
        description: `Search & filter the workspace directory. Combine filters in ONE call (all ANDed): query (name/email), jobTitle, company, city, country, roleTitle (workspace role like "Admin"/"Designer"), hasEmail/hasCellPhone/hasOfficePhone, birthdayMonth (1-12). Deactivated users are excluded unless includeDisabled is true. Returns { total, returned, truncated, people } — check "truncated" before telling the user "those are all". Never pass a UUID here (use getPerson). At least one filter is required.`,
        inputSchema: searchPeopleInput,
        execute: async input => {
            const limit = Math.min(input.limit ?? 50, 200);
            const includeDisabled = input.includeDisabled ?? false;

            const { total, rows } = await PeopleLoader.getAllWithCount({
                query: input.query,
                jobTitle: input.jobTitle,
                company: input.company,
                city: input.city,
                country: input.country,
                roleTitle: input.roleTitle,
                hasEmail: input.hasEmail,
                hasCellPhone: input.hasCellPhone,
                hasOfficePhone: input.hasOfficePhone,
                birthdayMonth: input.birthdayMonth,
                // AI tool defaults to excluding deactivated users; the loader defaults
                // to including everyone (preserving existing API behavior).
                disabled: includeDisabled ? undefined : false,
                limit,
            });

            const roleTitles = await roleIdToTitleMap();

            return {
                total,
                returned: rows.length,
                truncated: total > rows.length,
                people: rows.map(p => ({
                    id: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    email: p.email,
                    nickname: p.nickname,
                    jobTitle: p.jobTitle,
                    company: p.company,
                    officePhone: p.officePhone,
                    cellPhone: p.cellPhone,
                    city: p.city,
                    country: p.country,
                    notes: p.notes,
                    birthday: p.birthday,
                    roleTitle: p.role ? roleTitles.get(p.role) ?? null : null,
                    disabled: p.disabled,
                })),
            };
        },
    }),
];
