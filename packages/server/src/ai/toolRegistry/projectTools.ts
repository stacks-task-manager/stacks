// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: project metadata and overview data.
 */
import { z } from "zod";
import { RECORDTYPE } from "@stacks/types";
import { DocumentsLoader, ProjectsLoader } from "../../loaders";
import { getCurrentUser } from "../../loaders/context";
import type { IDocumentCreate } from "../../types/document";
import { defineTool } from "./defineTool";

/** Project-related AI tools (`ProjectsLoader`, `DocumentsLoader` for create — same as POST /documents). */
export const projectAiTools = [
    defineTool({
        name: "listProjects",
        description: `List projects the user can access (id + title). Use first when the user names a project, to obtain projectId.`,
        inputSchema: z.object({
            search: z.string().optional().describe("Case-insensitive title filter"),
        }),
        execute: async ({ search }) => {
            const projects = await ProjectsLoader.getAll();
            const q = search?.trim().toLowerCase();
            const filtered = q ? projects.filter(p => (p.title || "").toLowerCase().includes(q)) : projects;
            return filtered.map(p => ({
                id: p.id,
                title: p.title,
            }));
        },
    }),

    defineTool({
        name: "createProject",
        description: `Create a new project (same as the sidebar "new project" flow). Requires title. Do NOT use this for the current project's id in the UI block.`,
        inputSchema: z.object({
            title: z.string().min(1).describe("Project name"),
            description: z.string().optional().describe("Description"),
            parentFolderDocumentId: z.string().optional().describe("Folder document UUID; omit for top-level"),
            isPublic: z.boolean().optional().describe("Visibility; default true"),
            projectOwnerId: z.string().optional().describe("Owner UUID; defaults to current user"),
        }),
        execute: async ({ title, description, parentFolderDocumentId, isPublic, projectOwnerId }) => {
            const user = getCurrentUser();
            const payload: IDocumentCreate = {
                title,
                type: RECORDTYPE.PROJECT,
                permissions: {
                    isPublic: isPublic ?? true,
                    visibleUsers: [],
                    visibleRoles: [],
                },
                data: {
                    description: description ?? null,
                    projectOwner: projectOwnerId ?? user.id,
                    currency: "USD",
                    hourlyRate: 0,
                    automations: [],
                },
            };
            if (parentFolderDocumentId) {
                payload.parent = parentFolderDocumentId;
            }
            const doc = await DocumentsLoader.create(payload);
            return {
                id: doc.id,
                title: doc.title,
                type: doc.type,
            };
        },
    }),

    defineTool({
        name: "getProject",
        description: `Load one project by id. Returns stacksOrder, description, dates, company, owner.`,
        inputSchema: z.object({
            projectId: z.string().describe("Project UUID"),
        }),
        execute: async ({ projectId }) => {
            const p = await ProjectsLoader.getOne(projectId);
            return {
                id: p.id,
                description: p.description,
                notes: p.notes,
                stacksOrder: p.stacksOrder,
                health: p.health,
                company: p.company,
                projectOwner: p.projectOwner,
                startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
                endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
                inbox: p.inbox,
            };
        },
    }),
];
