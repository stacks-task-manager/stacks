// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: companies and org-level lookups.
 */
import { z } from "zod";
import type { IBookmark } from "@stacks/types";
import { BookmarksLoader, CompaniesLoader, TagsLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Tags, companies, bookmarks (`TagsLoader`, `CompaniesLoader`, `BookmarksLoader`). */
export const orgAiTools = [
    defineTool({
        name: "listTags",
        description: `List workspace tags and statuses (projects, people, timebox).`,
        inputSchema: z.object({}),
        execute: async () => {
            const tags = await TagsLoader.getAll();
            return tags.map(t => ({
                id: t.id,
                title: t.title,
                color: t.color,
                section: t.section,
                type: t.type,
                parent: t.parent,
            }));
        },
    }),

    defineTool({
        name: "listCompanies",
        description: `List companies. Optional title filter.`,
        inputSchema: z.object({
            search: z.string().optional().describe("Case-insensitive title filter"),
        }),
        execute: async ({ search }) => {
            const companies = await CompaniesLoader.getAll();
            const q = search?.trim().toLowerCase();
            const filtered = q ? companies.filter(c => (c.title || "").toLowerCase().includes(q)) : companies;
            return filtered.map(c => ({
                id: c.id,
                title: c.title,
                city: c.city,
                country: c.country,
                email: c.email,
                website: c.website,
            }));
        },
    }),

    defineTool({
        name: "getCompany",
        description: `Load one company by id.`,
        inputSchema: z.object({
            companyId: z.string().describe("Company UUID"),
        }),
        execute: async ({ companyId }) => {
            const c = await CompaniesLoader.getOne(companyId);
            return {
                id: c.id,
                title: c.title,
                industry: c.industry,
                notes: c.notes,
                website: c.website,
                email: c.email,
                phone: c.phone,
                address: c.address,
                city: c.city,
                zip: c.zip,
                country: c.country,
            };
        },
    }),

    defineTool({
        name: "listBookmarks",
        description: `List the current user's bookmarks (pinned tasks/projects/etc).`,
        inputSchema: z.object({}),
        execute: async () => {
            const bookmarks = (await BookmarksLoader.getAll()) as IBookmark[];
            return bookmarks.map(b => ({
                id: b.id,
                type: b.type,
                title: b.title,
                resourceId: b.resourceId,
                url: b.url,
                pinned: b.pinned,
            }));
        },
    }),
];
