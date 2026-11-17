// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { IPermissions, ITask, IWorkbook, IWorkbookFilters } from "@stacks/types";
import request from "./request";

export interface WorkbookCreateInput {
    title: string;
    filters: IWorkbookFilters;
    permissions?: Partial<IPermissions>;
}

export interface WorkbookUpdateInput {
    title?: string;
    filters?: IWorkbookFilters;
}

export const WorkbooksAPI = {
    loadAll(): Promise<IWorkbook[]> {
        return request.get("/api/workbooks");
    },
    load(id: string): Promise<IWorkbook> {
        return request.get(`/api/workbooks/${id}`);
    },
    create(data: WorkbookCreateInput): Promise<IWorkbook> {
        return request.post("/api/workbooks", data);
    },
    update(id: string, data: WorkbookUpdateInput): Promise<IWorkbook> {
        return request.patch(`/api/workbooks/${id}`, data);
    },
    remove(id: string): Promise<boolean> {
        return request.delete(`/api/workbooks/${id}`);
    },
    tasks(id: string): Promise<ITask[]> {
        return request.get(`/api/workbooks/${id}/tasks`);
    },
};
