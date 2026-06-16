// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Route shape sent from the React app.
 */
export type AiChatClientRoutePayload = {
    section: string;
    sectionId?: string;
    childId?: string;
    viewType?: string;
};

export type ParsedClientRoute = {
    viewKind: string;
    summary: string;
    projectId?: string;
    taskId?: string;
    notepadId?: string;
    personId?: string;
    companyId?: string;
    reportType?: string;
    fileId?: string;
    goalId?: string;
};

/**
 * Map React Router paths (see App.tsx MainAppRoutes) to a short description and inferred entity ids.
 */
export function parseClientRoute(payload: AiChatClientRoutePayload): ParsedClientRoute {
    const { section, sectionId, childId, viewType } = payload;

    if (section === "") {
        return {
            viewKind: "Splash / default",
            summary:
                "The user is on the default or unmatched route (not inside a specific project or record).",
        };
    }

    if (section === "home") {
        return { viewKind: "Home", summary: "The user is on the home dashboard." };
    }

    if (section === "reports") {
        if (sectionId) {
            return {
                viewKind: "Reports",
                reportType: sectionId,
                summary: `The user is viewing reports; report type segment: ${sectionId}.`,
            };
        }
        return { viewKind: "Reports", summary: "The user is on the reports overview." };
    }

    if (section === "inbox") {
        if (sectionId) {
            return {
                viewKind: "Inbox (task open)",
                taskId: sectionId,
                summary: `The user is in Inbox with a task detail open; task id: ${sectionId}.`,
            };
        }
        return { viewKind: "Inbox", summary: "The user is on the Inbox list." };
    }

    if (section === "mytasks") {
        if (sectionId) {
            return {
                viewKind: "My tasks (task open)",
                taskId: sectionId,
                summary: `The user is on My tasks with a task detail open; task id: ${sectionId}.`,
            };
        }
        return { viewKind: "My tasks", summary: "The user is on the My tasks list." };
    }

    if (section === "bookmarks") {
        return { viewKind: "Bookmarks", summary: "The user is on bookmarks." };
    }

    if (section === "calendar") {
        return { viewKind: "Calendar", summary: "The user is on the calendar." };
    }

    if (section === "people") {
        if (viewType === "contacts") {
            if (sectionId) {
                return {
                    viewKind: "Person profile",
                    personId: sectionId,
                    summary: `The user is viewing a person profile; person id: ${sectionId}. Prefer this person id when relevant.`,
                };
            }

            return {
                viewKind: "People list",
                summary: `The user is viewing the people list.`,
            };
        }

        if (viewType === "companies") {
            if (sectionId) {
                return {
                    viewKind: "Company profile",
                    companyId: sectionId,
                    summary: `The user is viewing a company profile; company id: ${sectionId}. Prefer this company id when relevant.`,
                };
            }

            return {
                viewKind: "Companies list",
                summary: `The user is viewing the companies list.`,
            };
        }
    }

    if (section === "person" && sectionId) {
        return {
            viewKind: "Person profile",
            personId: sectionId,
            summary: `The user is viewing a person profile; person id: ${sectionId}. Prefer this person id when relevant.`,
        };
    }

    if (section === "project") {
        return {
            viewKind: `Project ${viewType}`,
            projectId: sectionId,
            summary: `The user is on a project ${viewType}; project id: ${sectionId}. Prefer this project id when relevant.`,
        };
    }

    if (section === "notepad") {
        if (sectionId) {
            return {
                viewKind: "Notepad",
                notepadId: sectionId,
                summary: `The user is viewing a notepad; notepad id: ${sectionId}.`,
            };
        }
    }

    return {
        viewKind: "Other",
        summary: "The user is at a unknown route.",
    };
}

/** Markdown bullets for known record ids (avoids stacked Handlebars `if`s and blank lines). */
function formatInferredIdsSection(p: {
    projectId: string;
    taskId: string;
    notepadId: string;
    personId: string;
    companyId: string;
    reportType: string;
}): string {
    const lines: string[] = [];
    if (p.projectId) {
        lines.push(`- Project id: \`${p.projectId}\` (current project; not for createProject)`);
    }
    if (p.taskId) {
        lines.push(`- Task id: \`${p.taskId}\``);
    }
    if (p.notepadId) {
        lines.push(`- Notepad id: \`${p.notepadId}\``);
    }
    if (p.personId) {
        lines.push(`- Person id: \`${p.personId}\``);
    }
    if (p.companyId) {
        lines.push(`- Company id: \`${p.companyId}\``);
    }
    if (p.reportType) {
        lines.push(`- Reports segment: \`${p.reportType}\``);
    }
    return lines.join("\n");
}

export function clientRouteTemplateVars(route?: AiChatClientRoutePayload | null) {
    const empty = {
        hasClientRoute: false,
        viewKind: "",
        viewSummary: "",
        routeSection: "",
        projectId: "",
        taskId: "",
        notepadId: "",
        personId: "",
        companyId: "",
        reportType: "",
        inferredIdsSection: "",
    };

    if (!route) {
        return empty;
    }

    const parsed = parseClientRoute(route);
    const projectId = parsed.projectId ?? "";
    const taskId = parsed.taskId ?? "";
    const notepadId = parsed.notepadId ?? "";
    const personId = parsed.personId ?? "";
    const companyId = parsed.companyId ?? "";
    const reportType = parsed.reportType ?? "";

    return {
        hasClientRoute: true,
        viewKind: parsed.viewKind,
        viewSummary: parsed.summary,
        routeSection: route.section ?? "",
        projectId,
        taskId,
        notepadId,
        personId,
        companyId,
        reportType,
        inferredIdsSection: formatInferredIdsSection({
            projectId,
            taskId,
            notepadId,
            personId,
            companyId,
            reportType,
        }),
    };
}
