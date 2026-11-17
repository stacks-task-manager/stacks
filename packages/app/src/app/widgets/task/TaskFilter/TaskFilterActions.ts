// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { IWorkbookFilters } from "@stacks/types";

import type { IFilters } from "app/store/projectFilters";

export interface FilterActions<F> {
    set: <K extends keyof F>(key: K, value: F[K] | null | undefined) => void;
    setMultiple: (values: Partial<F>) => void;
}

export interface ProjectFilterActions extends FilterActions<IFilters> {
    setQuery: (query: string) => void;
    hide: () => void;
}

export type WorkbookFilterActions = FilterActions<IWorkbookFilters>;

interface ProjectTaskFilterProps {
    mode: "project" | "myTasks";
    filters: IFilters;
    actions: ProjectFilterActions;
}

interface WorkbookTaskFilterProps {
    mode: "workbook";
    filters: IWorkbookFilters;
    actions: WorkbookFilterActions;
}

export type TaskFilterProps = ProjectTaskFilterProps | WorkbookTaskFilterProps;
