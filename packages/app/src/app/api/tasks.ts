// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task board API: filters, CRUD, move, duplicate, archive.
 */
import { ITask } from "@stacks/types";
import request from "./request";

/** GET `/api/tasks` query shape. */
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

export const TasksAPI = {
    /** Filtered task list. */
    async load(params: TaskLoadParams): Promise<ITask[]> {
        return request.get("/api/tasks", { params });
    },
    /** Creates a task at top or bottom of stack. */
    async add(task: Partial<ITask>, top?: boolean): Promise<ITask> {
        return request.post("/api/tasks", { task, position: top ? "top" : "bottom" });
    },
    /** Hard-deletes a task. */
    async delete(taskId: string): Promise<boolean> {
        return request.delete(`/api/tasks/${taskId}`);
    },
    /** Archives a task. */
    async archive(taskId: string): Promise<boolean> {
        return request.patch(`/api/tasks/${taskId}/archive`);
    },
    /** Restores from archive; optional target stack. */
    async unarchive(taskId: string, stack?: string): Promise<boolean> {
        return request.patch(`/api/tasks/${taskId}/unarchive`, { stack });
    },
    /** PATCH task fields. */
    async update(taskId: string, data: Partial<ITask>): Promise<ITask> {
        return request.patch(`/api/tasks/${taskId}`, data);
    },
    /** Clones a task; returns new id. */
    async duplicate(taskId: string, params: any): Promise<string> {
        return request.post(`/api/tasks/${taskId}/duplicate`, { params });
    },
    /** Resolves stack id for a task. */
    async stack(taskId: string): Promise<string> {
        return request.get(`/api/tasks/${taskId}/stack`);
    },
    /** Reorders task within/across stacks. */
    async move(task: string, stack: string, after?: string): Promise<boolean> {
        return request.post("/api/tasks/move", { task, stack, after });
    },
};
