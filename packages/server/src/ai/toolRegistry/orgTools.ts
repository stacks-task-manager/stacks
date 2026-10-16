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
        description: `Read workspace tags and status labels. Returns ids, titles, colors, sections, types, and parent references. A status has type status; resolve a named label to the correct id before filtering or updating a task. Does not create tags.`,
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
        description: `Read companies, optionally filtering by a case-insensitive title substring. Returns ids, titles, city, country, email, and website. Use getCompany for one company's detailed record; multiple similar titles require disambiguation.`,
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
        description: `Read a company's detailed contact information, industry, notes, and address by resolved company id. Returns one record; use listCompanies to resolve a name when available.`,
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
        description: `Read the authenticated user's bookmarks. Returns an array of ids, record types, titles, resource references, URLs, and pinned flags. Does not create bookmarks or navigate to them.`,
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
