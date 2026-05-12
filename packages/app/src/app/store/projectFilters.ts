// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Saved filters for project board.
 */
import { entity } from "app/hooks/store";

import { IStack, PRIORITY } from "@stacks/types";

export interface IFilters {
    id?: string;
    title?: string;
    query: string;
    tags: string[];
    status?: string;
    stack?: IStack;
    priority?: PRIORITY;
    state: "all" | "done" | "todo";
    assignees: string[];
    nobody?: boolean;
    startDate?: string;
    doDate?: string;
    dueDate?: string;
    me?: boolean;
    overdue: boolean;
    inProgress: boolean;
    project?: string;
    skipMe?: boolean;
    onlyAssigned?: boolean;
    showSubtasks?: boolean;
}

interface ProjectFilters {
    [id: string]: {
        isVisible: boolean;
        filters: IFilters;
    };
}

interface ProjectSavedFilters {
    [id: string]: IFilters[];
}

export interface IProjectFiltersStore {
    filters: ProjectFilters;
    savedFilters: ProjectSavedFilters;
    attachmentsQuery: string;
    linksQuery: string;
}

export const defaultFilters: IFilters = {
    id: undefined,
    title: undefined,
    query: "",
    tags: [],
    assignees: [],
    nobody: undefined,
    startDate: undefined,
    doDate: undefined,
    dueDate: undefined,
    state: "todo",
    priority: undefined,
    overdue: false,
    inProgress: false,
    me: undefined,
    showSubtasks: false,
};

export const ProjectFiltersStore = entity<IProjectFiltersStore>({
    filters: {},
    savedFilters: {},
    attachmentsQuery: "",
    linksQuery: "",
});
