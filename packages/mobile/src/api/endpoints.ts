// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type {
    IActivity,
    IAttachment,
    ICalendar,
    ICalendarEvent,
    ICompany,
    INotepad,
    INotification,
    IPerson,
    IPreferences,
    IProject,
    IProjectOverview,
    IReminder,
    IReport,
    IRole,
    IRoleAccess,
    IStack,
    ITag,
    ITask,
    ISearchResult,
    ITimeLog,
    PRIORITY,
    REPORT_TYPE,
    TIMELOG_STATUS,
    TreeNode,
} from "@stacks/types";
import { RECORDTYPE } from "@stacks/types";
import type { AxiosResponse } from "axios";

import { api } from "./client";
import type { ApiSuccess } from "./types";

function unwrap<T>(res: AxiosResponse<ApiSuccess<T>>): T {
    const body = res.data;
    if (!body.success) {
        throw new Error("Unexpected API response");
    }
    if (body.data === undefined) {
        throw new Error("API response missing data");
    }
    return body.data;
}

export type LoginResult = {
    token: string;
    user: string;
    id: string;
};

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
    const res = await api.post<ApiSuccess<LoginResult>>("/auth/login", { email, password });
    return unwrap(res);
}

export type DocumentsResponse = {
    documents: TreeNode[];
    tags: unknown[];
};

export async function fetchDocuments(): Promise<DocumentsResponse> {
    const res = await api.get<ApiSuccess<DocumentsResponse>>("/api/documents");
    return unwrap(res);
}

export async function createDocument(payload: {
    title: string;
    type: RECORDTYPE.PROJECT | RECORDTYPE.NOTEPAD | RECORDTYPE.FOLDER;
    parent?: string | null;
    data?: unknown;
}): Promise<TreeNode> {
    const body: Record<string, unknown> = {
        title: payload.title,
        type: payload.type,
        parent: payload.parent ?? null,
        permissions: { isPublic: true, visibleUsers: [], visibleRoles: [] },
    };
    if (payload.data !== undefined) {
        body.data = payload.data;
    }
    const res = await api.post<ApiSuccess<TreeNode>>("/api/documents", body);
    return unwrap(res);
}

export async function deleteDocument(id: string): Promise<void> {
    await api.delete(`/api/documents/${id}`);
}

export async function fetchProject(id: string): Promise<IProject> {
    const res = await api.get<ApiSuccess<IProject>>(`/api/projects/${id}`);
    return unwrap(res);
}

export async function fetchStacks(projectId: string): Promise<IStack[]> {
    const res = await api.get<ApiSuccess<IStack[]>>(`/api/projects/${projectId}/stacks`);
    return unwrap(res);
}

export async function updateProjectStacksOrder(
    projectId: string,
    stacksOrder: string[]
): Promise<void> {
    await api.patch(`/api/projects/${projectId}`, { stacksOrder });
}

/**
 * Partial update of a project record. The server merges the fields we send,
 * so callers can pass only the properties they're actually changing.
 */
export async function updateProject(
    projectId: string,
    patch: Partial<IProject>
): Promise<void> {
    await api.patch(`/api/projects/${projectId}`, patch);
}

/**
 * Partial update of a document record (the tree node that wraps projects,
 * notepads, …). Mainly used to rename the document, since the display title
 * on the drawer and the project header both come from the document row.
 */
export async function updateDocument(
    documentId: string,
    patch: { title?: string; parent?: string | null }
): Promise<void> {
    await api.patch(`/api/documents/${documentId}`, patch);
}

export async function createStack(projectId: string, title: string, index?: number | null): Promise<IStack> {
    const res = await api.post<ApiSuccess<IStack>>("/api/stacks", {
        title,
        project: projectId,
        index: index ?? null,
    });
    return unwrap(res);
}

export async function fetchTasksForProject(projectId: string): Promise<ITask[]> {
    const res = await api.get<ApiSuccess<ITask[]>>("/api/tasks", {
        params: { project: projectId },
    });
    return unwrap(res);
}

export async function fetchTasksForAssignee(userId: string): Promise<ITask[]> {
    const res = await api.get<ApiSuccess<ITask[]>>("/api/tasks", {
        params: { assignees: userId },
    });
    return unwrap(res);
}

export async function fetchTask(id: string): Promise<ITask> {
    const res = await api.get<ApiSuccess<ITask>>(`/api/tasks/${id}`);
    return unwrap(res);
}

export async function createTask(payload: {
    title: string;
    project: string;
    stack: string;
    description?: string;
    priority?: "none" | "low" | "medium" | "high" | "critical" | null;
}): Promise<ITask> {
    const res = await api.post<ApiSuccess<ITask>>("/api/tasks", {
        task: {
            title: payload.title,
            project: payload.project,
            stack: payload.stack,
            description: payload.description,
            priority: payload.priority ?? "none",
        },
        position: "bottom",
    });
    return unwrap(res);
}

export async function deleteTask(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
}

export type TaskUpdate = {
    title?: string;
    description?: string;
    done?: boolean;
    startdate?: string | null;
    duedate?: string | null;
    dodate?: string | null;
    tags?: string[];
    status?: string;
    estimate?: number | null;
    progress?: number;
    priority?: PRIORITY;
    assignees?: string[];
    tint?: string;
    cover?: string | null;
    stack?: string;
    hourlyRate?: number | null;
};

export async function updateTask(id: string, patch: TaskUpdate): Promise<void> {
    await api.patch(`/api/tasks/${id}`, patch);
}

export async function archiveTask(id: string): Promise<void> {
    await api.patch(`/api/tasks/${id}/archive`);
}

export async function unarchiveTask(id: string, stack?: string | null): Promise<void> {
    await api.patch(`/api/tasks/${id}/unarchive`, stack ? { stack } : {});
}

export async function fetchNotepad(id: string): Promise<INotepad> {
    const res = await api.get<ApiSuccess<INotepad>>(`/api/notepads/${id}`);
    return unwrap(res);
}

export async function updateNotepad(id: string, content: string): Promise<void> {
    await api.patch(`/api/notepads/${id}`, { content });
}

export async function search(query: string): Promise<ISearchResult[]> {
    const res = await api.get<ApiSuccess<ISearchResult[]>>("/api/search", {
        params: { query },
    });
    return unwrap(res);
}

export async function fetchPeople(): Promise<IPerson[]> {
    const res = await api.get<ApiSuccess<IPerson[]>>("/api/people");
    return unwrap(res);
}

export async function fetchCompanies(): Promise<ICompany[]> {
    const res = await api.get<ApiSuccess<ICompany[]>>("/api/companies");
    return unwrap(res);
}

export async function fetchCompany(id: string): Promise<ICompany> {
    const res = await api.get<ApiSuccess<ICompany>>(`/api/companies/${id}`);
    return unwrap(res);
}

export async function fetchPerson(id: string): Promise<IPerson> {
    const res = await api.get<ApiSuccess<IPerson>>(`/api/people/${id}`);
    return unwrap(res);
}

export async function moveTask(payload: {
    task: string;
    stack: string;
    /** Id of task to place after; null/omitted = top of the target stack. */
    after?: string | null;
}): Promise<void> {
    await api.post<ApiSuccess<void>>("/api/tasks/move", {
        task: payload.task,
        stack: payload.stack,
        after: payload.after ?? null,
    });
}

export async function fetchTags(): Promise<ITag[]> {
    const res = await api.get<ApiSuccess<ITag[]>>("/api/tags");
    return unwrap(res);
}

/**
 * Filtered task list. Mirrors the web `TasksAPI.load` query shape.
 */
export interface TaskLoadParams {
    ids?: string[];
    project?: string | string[];
    stack?: string | string[];
    archived?: boolean;
    completed?: boolean;
    open?: boolean;
    assigned?: boolean;
    unassigned?: boolean;
    assignees?: string[];
    parent?: string;
    query?: string;
    from?: Date;
    to?: Date;
}

export async function fetchTasks(params: TaskLoadParams): Promise<ITask[]> {
    const res = await api.get<ApiSuccess<ITask[]>>("/api/tasks", { params });
    return unwrap(res);
}

/* ------------------------------------------------------------------------- *
 *  Calendars & events
 * ------------------------------------------------------------------------- */

export async function fetchCalendars(): Promise<ICalendar[]> {
    const res = await api.get<ApiSuccess<ICalendar[]>>("/api/calendars");
    return unwrap(res);
}

export async function createCalendar(data: {
    title: string;
    color?: string;
    primary?: boolean;
}): Promise<ICalendar> {
    const res = await api.post<ApiSuccess<ICalendar>>("/api/calendars", data);
    return unwrap(res);
}

/** Events overlapping [from, to]; optionally restricted to a set of calendars. */
export async function fetchEvents(from: Date, to: Date, calendars?: string[]): Promise<ICalendarEvent[]> {
    const res = await api.get<ApiSuccess<ICalendarEvent[]>>("/api/events", {
        params: {
            from: from.toISOString(),
            to: to.toISOString(),
            ...(calendars && calendars.length ? { calendars } : {}),
        },
    });
    return unwrap(res);
}

export async function createEvent(event: Partial<ICalendarEvent>): Promise<ICalendarEvent> {
    const res = await api.post<ApiSuccess<ICalendarEvent>>("/api/events", event);
    return unwrap(res);
}

export async function updateEvent(eventId: string, patch: Partial<ICalendarEvent>): Promise<void> {
    await api.patch(`/api/events/${eventId}`, patch);
}

export async function deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/api/events/${eventId}`);
}

/* ------------------------------------------------------------------------- *
 *  Notifications
 * ------------------------------------------------------------------------- */

export async function fetchNotifications(): Promise<INotification[]> {
    const res = await api.get<ApiSuccess<INotification[]>>("/api/notifications");
    return unwrap(res);
}

export async function readNotification(id: string): Promise<void> {
    await api.patch(`/api/notifications/${id}`);
}

export async function deleteNotification(id: string): Promise<void> {
    await api.delete(`/api/notifications/${id}`);
}

/* ------------------------------------------------------------------------- *
 *  Activities (task timeline feed)
 * ------------------------------------------------------------------------- */

export async function fetchActivities(resourceId: string): Promise<IActivity[]> {
    const res = await api.get<ApiSuccess<IActivity[]>>(`/api/activities/${resourceId}`);
    return unwrap(res);
}

export async function addActivity(
    activity: Omit<IActivity, "id" | "created" | "updated">
): Promise<IActivity> {
    const res = await api.post<ApiSuccess<IActivity>>("/api/activities", activity);
    return unwrap(res);
}

/* ------------------------------------------------------------------------- *
 *  Timelogs
 * ------------------------------------------------------------------------- */

export interface TimelogsFilterParams {
    project?: string;
    task?: string;
    start?: string;
    end?: string;
    status?: TIMELOG_STATUS;
}

export async function fetchTimelogs(params: TimelogsFilterParams): Promise<ITimeLog[]> {
    const res = await api.get<ApiSuccess<ITimeLog[]>>("/api/timelogs", { params });
    return unwrap(res);
}

export async function createTimelog(timelog: Partial<ITimeLog>): Promise<ITimeLog> {
    const res = await api.post<ApiSuccess<ITimeLog>>("/api/timelogs", timelog);
    return unwrap(res);
}

export async function updateTimelog(id: string, patch: Partial<ITimeLog>): Promise<void> {
    await api.patch(`/api/timelogs/${id}`, patch);
}

export async function deleteTimelog(id: string): Promise<void> {
    await api.delete(`/api/timelogs/${id}`);
}

/* ------------------------------------------------------------------------- *
 *  Reports
 * ------------------------------------------------------------------------- */

/** Catalog of available report cards. */
export async function fetchReports(): Promise<IReport[]> {
    const res = await api.get<ApiSuccess<IReport[]>>("/api/reports");
    return unwrap(res);
}

/** Payload for a single report type. The shape varies per report. */
export async function fetchReport(type: REPORT_TYPE, span?: string): Promise<unknown> {
    const params = span && span !== "all-time" ? { span } : undefined;
    const res = await api.get<ApiSuccess<unknown>>(`/api/reports/${type}`, params ? { params } : {});
    return unwrap(res);
}

/* ------------------------------------------------------------------------- *
 *  Reminders
 * ------------------------------------------------------------------------- */

export async function fetchReminders(recordId: string): Promise<IReminder[]> {
    const res = await api.get<ApiSuccess<IReminder[]>>(`/api/reminders/${recordId}`);
    return unwrap(res);
}

export async function createReminder(reminder: Omit<IReminder, "id">): Promise<void> {
    await api.post(`/api/reminders`, reminder);
}

export async function deleteReminder(id: string): Promise<void> {
    await api.delete(`/api/reminders/${id}`);
}

/* ------------------------------------------------------------------------- *
 *  Preferences
 * ------------------------------------------------------------------------- */

export async function fetchPreferences(): Promise<IPreferences> {
    const res = await api.get<ApiSuccess<IPreferences>>("/api/preferences");
    return unwrap(res);
}

export async function updatePreferences(preferences: IPreferences): Promise<void> {
    await api.patch(`/api/preferences`, preferences);
}

/* ------------------------------------------------------------------------- *
 *  Project analytics, roles & attachments
 * ------------------------------------------------------------------------- */

export async function fetchProjectOverview(id: string): Promise<IProjectOverview> {
    const res = await api.get<ApiSuccess<IProjectOverview>>(`/api/projects/${id}/overview`);
    return unwrap(res);
}

export async function fetchRoles(): Promise<IRole[]> {
    const res = await api.get<ApiSuccess<IRole[]>>("/api/roles");
    return unwrap(res);
}

export async function createRole(payload: {
    title: string;
    description?: string;
    access?: IRoleAccess;
    disabled?: boolean;
}): Promise<IRole> {
    const res = await api.post<ApiSuccess<IRole>>("/api/roles", payload);
    return unwrap(res);
}

export async function updateRole(
    id: string,
    payload: {
        title?: string;
        description?: string;
        access?: IRoleAccess;
        disabled?: boolean;
    }
): Promise<void> {
    await api.patch(`/api/roles/${id}`, payload);
}

export async function fetchAttachments(
    recordId: string,
    type?: string
): Promise<IAttachment[]> {
    const params = type ? { type } : undefined;
    const res = await api.get<ApiSuccess<IAttachment[]>>(
        `/api/files/attachments/${recordId}`,
        params ? { params } : {}
    );
    return unwrap(res);
}

/** Find the workspace inbox project id, if any. */
export async function findInboxProjectId(documents: TreeNode[]): Promise<string | null> {
    const projectIds = documents.filter(d => d.type === RECORDTYPE.PROJECT).map(d => d.id);
    for (const pid of projectIds) {
        try {
            const p = await fetchProject(pid);
            if (p.inbox) {
                return pid;
            }
        } catch {
            /* skip */
        }
    }
    return null;
}
