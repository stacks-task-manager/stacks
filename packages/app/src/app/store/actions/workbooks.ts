// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { produce } from "immer";
import type { IPermissions, ITask, IWorkbook } from "@stacks/types";
import { translate } from "@stacks/translations";

import {
    ExportAPI,
    PermissionsAPI,
    WorkbooksAPI,
    type WorkbookCreateInput,
    type WorkbookUpdateInput,
} from "app/api";
import { PeopleStore } from "app/store/people";
import { ProjectsStore } from "app/store/projects";
import { WorkbooksStore } from "app/store/workbooks";
import { TasksActions } from "./tasks";

const sortWorkbooks = (workbooks: IWorkbook[]) =>
    [...workbooks].sort(
        (left, right) => new Date(right.updated).getTime() - new Date(left.updated).getTime()
    );

const upsert = (workbook: IWorkbook) => {
    WorkbooksStore.set(
        produce((state: { workbooks: IWorkbook[]; isLoading: boolean }) => {
            state.workbooks = sortWorkbooks([
                workbook,
                ...state.workbooks.filter(existing => existing.id !== workbook.id),
            ]);
        })
    );
};

const loadAll = async (): Promise<IWorkbook[]> => {
    WorkbooksStore.set(
        produce((state: { workbooks: IWorkbook[]; isLoading: boolean }) => {
            state.isLoading = true;
        })
    );
    try {
        const workbooks = await WorkbooksAPI.loadAll();
        WorkbooksStore.set(
            produce((state: { workbooks: IWorkbook[]; isLoading: boolean }) => {
                state.workbooks = sortWorkbooks(workbooks);
            })
        );
        return workbooks;
    } finally {
        WorkbooksStore.set(
            produce((state: { workbooks: IWorkbook[]; isLoading: boolean }) => {
                state.isLoading = false;
            })
        );
    }
};

const load = async (id: string): Promise<IWorkbook> => {
    const cached = WorkbooksStore.get().workbooks.find(workbook => workbook.id === id);
    if (cached) return cached;
    const workbook = await WorkbooksAPI.load(id);
    upsert(workbook);
    return workbook;
};

const create = async (data: WorkbookCreateInput): Promise<IWorkbook> => {
    const workbook = await WorkbooksAPI.create(data);
    upsert(workbook);
    return workbook;
};

const update = async (id: string, data: WorkbookUpdateInput): Promise<IWorkbook> => {
    const workbook = await WorkbooksAPI.update(id, data);
    upsert(workbook);
    return workbook;
};

const remove = async (id: string): Promise<boolean> => {
    await WorkbooksAPI.remove(id);
    WorkbooksStore.set(
        produce((state: { workbooks: IWorkbook[]; isLoading: boolean }) => {
            state.workbooks = state.workbooks.filter(workbook => workbook.id !== id);
        })
    );
    return true;
};

const updatePermissions = async (id: string, permissions: IPermissions): Promise<void> => {
    await PermissionsAPI.update(permissions.id, permissions);
    WorkbooksStore.set(
        produce((state: { workbooks: IWorkbook[]; isLoading: boolean }) => {
            state.workbooks = state.workbooks.map(workbook =>
                workbook.id === id ? { ...workbook, permissions } : workbook
            );
        })
    );
};

const reload = async (): Promise<void> => {
    await loadAll();
};

const loadTasks = async (id: string): Promise<ITask[]> => {
    const tasks = await WorkbooksAPI.tasks(id);
    await TasksActions.upsertTasks(tasks);
    return tasks;
};

const exportWorkbook = async (
    workbook: IWorkbook,
    tasks: ITask[],
    format: "json" | "excel"
): Promise<void> => {
    await ExportAPI.export({
        title: workbook.title || translate("Workbooks"),
        type: "workbook",
        format,
        data: {
            workbook,
            tasks,
            projects: ProjectsStore.get().projects,
            people: PeopleStore.get().people,
        },
    });
};

export const WorkbooksActions = {
    loadAll,
    load,
    create,
    update,
    remove,
    updatePermissions,
    reload,
    loadTasks,
    exportWorkbook,
};
