// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Kanban stacks: CRUD, reorder, and copy/move placeholders.
 */
import { INewStack, IStack } from "@stacks/types";
import request from "./request";

export const StacksAPI = {
    /** Lists stacks for a project. */
    async loadAll(projectId: string): Promise<IStack[]> {
        return request.get(`/api/projects/${projectId}/stacks`);
    },
    /** GET one stack. */
    async load(id: string): Promise<IStack> {
        return request.get(`/api/stacks/${id}`);
    },
    /** Creates a stack with optional sort index. */
    async add(stack: INewStack, index?: number): Promise<IStack> {
        return request.post("/api/stacks", { ...stack, index });
    },
    /** PATCH stack fields. */
    async update(id: string, stack: Partial<IStack>) {
        return request.patch(`/api/stacks/${id}`, stack);
    },
    /** Deletes stack; `tasks` deletes contained tasks instead. */
    async delete(id: string, tasks?: boolean) {
        return request.delete(`/api/stacks/${id}`, { params: { tasks } });
    },
    /** Reorders relative to another stack id. */
    async move(stack: string, after: string | null) {
        return request.post("/api/stacks/move", { stack, after });
    },
    /** Server stub for cross-project copy/move. */
    async copyMove(
        type: "copy" | "move",
        id: string,
        fromProjectId: string,
        toProjectId: string | undefined,
        before: boolean
    ): Promise<boolean> {
        return request.post(`/api/stacks/${id}/${type}`, { fromProjectId, toProjectId, before });
    },
};
