// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * REST client for project CRUD, stacks, overview, and bulk archive.
 */
import { IProject, IProjectOverview, IStack } from "@stacks/types";
import request from "./request";

export const ProjectsAPI = {
    /** PATCH project fields. */
    async update(id: string, data: Partial<IProject>) {
        return request.patch(`/api/projects/${id}`, data);
    },
    /** GET one project by id. */
    async load(id: string): Promise<IProject> {
        return request.get(`/api/projects/${id}`);
    },
    /** Lists stacks for a project. */
    async getStacks(id: string): Promise<IStack[]> {
        return request.get(`/api/projects/${id}/stacks`);
    },
    /** Deletes a project. */
    async delete(id: string): Promise<boolean> {
        return request.delete(`/api/projects/${id}`);
    },
    /** Clones a project server-side. */
    async duplicate(id: string): Promise<IProject> {
        return request.post(`/api/projects/${id}/duplicate`);
    },
    /** Aggregated stats and charts for the project dashboard. */
    async overview(id: string): Promise<IProjectOverview> {
        return request.get(`/api/projects/${id}/overview`);
    },
    /** Archives every completed task in the project. */
    async archiveCompleted(id: string): Promise<string[]> {
        return request.post(`/api/projects/${id}/archive-completed`);
    },
};
