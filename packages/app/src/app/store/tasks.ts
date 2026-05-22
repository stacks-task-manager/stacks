// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Normalized tasks map and board state.
 */
import { entity } from "app/hooks/store";
import { ITask } from "@stacks/types";

export interface ITasksStore {
    isLoading: boolean;
    loadingChunk: string[]; // used to indentify which tasks are loading
    tasks: ITask[];
    loadedProjects: string[];
    isLoadingArchived: boolean;
}

export const TasksStore = entity<ITasksStore>({
    isLoading: false,
    loadingChunk: [],
    tasks: [],
    loadedProjects: [],
    isLoadingArchived: false,
});
