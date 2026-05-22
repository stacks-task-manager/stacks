// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { entity } from "app/hooks/store";
import { produce } from "immer";

import Storage from "app/utils/storage";
import { GROUPING_TYPE, ITableColumn } from "@stacks/types";
import { ProjectsActions } from "app/store/actions";
import { getProjectIdFromHashPath } from "app/hooks/router";

interface ITableStore {
    visibleColumns: string[];
    sortBy: string;
    sortDesc: boolean;
    grouping: GROUPING_TYPE;
}

const defaultVisibleColumns = ["title", "startdate", "duedate", "progress", "tags", "stack"];

export const TableStore = entity<ITableStore>(
    {
        visibleColumns: [...defaultVisibleColumns],
        sortBy: "startdate",
        sortDesc: false,
        grouping: GROUPING_TYPE.UNGROUPED,
    },
    [
        {
            set:
                (origSet, entity) =>
                (...args) => {
                    const prev = entity.get();
                    origSet(...args);

                    const project = ProjectsActions.getCurrentProject();
                    if (project) {
                        // saving sorting
                        if (prev.sortBy !== entity.get().sortBy || prev.sortDesc !== entity.get().sortDesc) {
                            Storage.set(`table-sortBy-projects-${project.id}`, entity.get().sortBy);
                            Storage.set(`table-sortDesc-projects-${project.id}`, entity.get().sortDesc);
                        }

                        // saving grouping
                        if (prev.grouping !== entity.get().grouping) {
                            Storage.set(`table-grouping-projects-${project.id}`, entity.get().grouping);
                        }

                        // saving visible columns
                        if (prev.visibleColumns !== entity.get().visibleColumns) {
                            Storage.set(`table-columns-projects-${project.id}`, entity.get().visibleColumns);
                        }
                    }
                },
        },
    ]
);

export const restoreDefaults = () => {
    const projectId = getProjectIdFromHashPath();
    const sortBy = Storage.get(`table-sortBy-projects-${projectId}`, false, "startdate");
    const sortDesc = Storage.get(`table-sortDesc-projects-${projectId}`, true, false);
    const savedColumns = Storage.get(`table-columns-projects-${projectId}`, true, [...defaultVisibleColumns]);
    const grouping = Storage.get(`table-grouping-projects-${projectId}`, false, "ungrouped");

    TableStore.set(
        produce((state: ITableStore) => {
            state.sortBy = sortBy;
            state.sortDesc = sortDesc;
            state.grouping = grouping;
            state.visibleColumns = savedColumns;
        })
    );
};

export const toggleColumn = (column: ITableColumn) => {
    TableStore.set(
        produce((state: ITableStore) => {
            const index = state.visibleColumns.indexOf(column.name);

            if (index > -1) {
                state.visibleColumns.splice(index, 1);
            } else {
                state.visibleColumns.push(column.name);
            }
        })
    );
};

export const setSorting = (by: string, desc: boolean) => {
    TableStore.set(
        produce((state: ITableStore) => {
            state.sortBy = by;
            state.sortDesc = desc;
        })
    );
};

export const setGrouping = (grouping: GROUPING_TYPE) => {
    if (TableStore.get().grouping === grouping) return;

    TableStore.set(
        produce((state: ITableStore) => {
            state.grouping = grouping;
        })
    );
};
