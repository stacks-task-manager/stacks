// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type {
    ICompany,
    INotepad,
    IPerson,
    IProject,
    IStack,
    ITag,
    ITask,
    ISearchResult,
    PRIORITY,
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
