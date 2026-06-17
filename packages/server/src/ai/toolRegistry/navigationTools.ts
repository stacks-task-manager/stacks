// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: UI navigation. Produces an app path plus a `label` that the client bridge
 * turns into an auto-redirect or a click-to-open button (see `aiChatNavigationWidget`).
 *
 * Keep routes in sync with `packages/app/src/app/App.tsx` `MainAppRoutes`.
 */
import { z } from "zod";
import { getCurrentUser } from "../../loaders/context";
import { defineTool } from "./defineTool";

const ENTITY_VIEWS = ["project", "person", "company", "notepad", "goal", "file", "task"] as const;
const FLAT_VIEWS = ["home", "calendar", "inbox", "myTasks", "bookmarks", "reports", "people"] as const;
const SPECIAL_VIEWS = ["myProfile", "reportType"] as const;

const VIEW_LABELS: Record<string, string> = {
    home: "Open Home",
    calendar: "Open Calendar",
    inbox: "Open Inbox",
    myTasks: "Open My Tasks",
    bookmarks: "Open Bookmarks",
    reports: "Open Reports",
    people: "Open People",
    myProfile: "Open my profile",
    project: "Open project",
    person: "Open person",
    company: "Open company",
    notepad: "Open notepad",
    goal: "Open goal",
    file: "Open file",
    task: "Open task",
    reportType: "Open report",
};

function buildHashPath(view: string, id: string | undefined): string {
    switch (view) {
        case "home":
            return "/home";
        case "calendar":
            return "/calendar";
        case "inbox":
            return "/inbox";
        case "myTasks":
            return "/mytasks";
        case "bookmarks":
            return "/bookmarks";
        case "reports":
            return "/reports";
        case "people":
            return "/people";
        case "myProfile":
            return `/person/${getCurrentUser().id}`;
        case "project":
            return `/project/${id}`;
        case "person":
            return `/person/${id}`;
        case "company":
            return `/company/${id}`;
        case "notepad":
            return `/notepad/${id}`;
        case "goal":
            return `/goal/${id}`;
        case "file":
            return `/file/${id}`;
        case "task":
            return `/task/${id}`;
        case "reportType":
            return `/reports/${id}`;
        default:
            throw new Error(`Unsupported view: ${view}`);
    }
}

const VIEWS_REQUIRING_ID = new Set<string>([...ENTITY_VIEWS, "reportType"]);

export const navigationAiTools = [
    defineTool({
        name: "navigate",
        description:
            "Open any app route. For filtered task lists use findTasks instead (it builds /tasks URLs with filters). For a specific task open use view='task'. Entity views (project/person/company/notepad/goal/file/task) require id. myProfile resolves to the current user automatically. Returns { hashPath, label } that the client turns into a navigation widget.",
        inputSchema: z
            .object({
                view: z
                    .enum([...FLAT_VIEWS, ...ENTITY_VIEWS, ...SPECIAL_VIEWS])
                    .describe(
                        "Route kind: flat (home/calendar/inbox/myTasks/bookmarks/reports/people), entity (project/person/company/notepad/goal/file/task — need id), special (myProfile, reportType)."
                    ),
                id: z
                    .string()
                    .optional()
                    .describe(
                        "UUID for entity views, or report-type slug for reportType. Omit for flat views and myProfile."
                    ),
                label: z
                    .string()
                    .optional()
                    .describe(
                        "Override the button label shown to the user (e.g. 'Open project Acme')."
                    ),
            })
            .refine(d => !VIEWS_REQUIRING_ID.has(d.view) || (typeof d.id === "string" && d.id.length > 0), {
                message:
                    "This view requires 'id' (UUID for entity views, or the report-type slug for reportType).",
                path: ["id"],
            }),
        execute: async ({ view, id, label }) => {
            const hashPath = buildHashPath(view, id);
            return {
                view,
                id: id ?? null,
                hashPath,
                label: label || VIEW_LABELS[view] || "Open",
            };
        },
    }),
];
