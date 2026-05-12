// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { produce } from "immer";
import isEqual from "lodash/isEqual";

import { Entity, entity } from "app/hooks/store";
import Storage from "app/utils/storage";

interface TablePersistentDefaults {
    defaultVisibleColumns?: string[];
    defaultColumnsWidths?: { [name: string]: number };
    defaultColumnOrder?: string[];
}

interface TablePersistentStore {
    visibleColumns: string[];
    columnWidths: { [name: string]: number };
    columnsOrder: string[];
    sortBy: string;
    sortDesc: boolean;
}

class TableStoreSingleton {
    private static instance: { [id: string]: TableStoreSingleton };
    public store: Entity<TablePersistentStore>;

    private constructor(
        id: string,
        { defaultVisibleColumns, defaultColumnsWidths, defaultColumnOrder }: TablePersistentDefaults
    ) {
        this.store = entity<TablePersistentStore>(
            {
                visibleColumns: [],
                columnWidths: {},
                columnsOrder: [],
                sortBy: "",
                sortDesc: false,
            },
            [
                {
                    init: (origInit, entity) => () => {
                        origInit();

                        const visibleColumns = Storage.get(`table-${id}-visible-columns`, true);
                        const columnWidths = Storage.get(`table-${id}-columns-widths`, true);
                        const columnsOrder = Storage.get(`table-${id}-columns-order`, true);
                        const sortBy = Storage.get(`table-${id}-sort-by`);
                        const sortDesc = Storage.get(`table-${id}-sort-desc`, true);

                        entity.set(
                            produce((state: TablePersistentStore) => {
                                state.visibleColumns = visibleColumns ?? defaultVisibleColumns;
                                state.columnWidths = columnWidths ?? defaultColumnsWidths;
                                state.columnsOrder = columnsOrder ?? defaultColumnOrder;
                                state.sortBy = sortBy;
                                state.sortDesc = sortDesc;
                            })
                        );
                    },
                    set:
                        (origSet, entity) =>
                            (...args) => {
                                const prev = entity.get();
                                origSet(...args);

                                // saving visible columns
                                if (!isEqual(prev.visibleColumns, entity.get().visibleColumns)) {
                                    Storage.set(
                                        `table-${id}-visible-columns`,
                                        entity.get().visibleColumns
                                    );
                                }

                                // saving columns widths
                                if (!isEqual(prev.columnWidths, entity.get().columnWidths)) {
                                    Storage.set(`table-${id}-columns-widths`, entity.get().columnWidths);
                                }

                                // saving columns order
                                if (!isEqual(prev.columnsOrder, entity.get().columnsOrder)) {
                                    Storage.set(`table-${id}-columns-order`, entity.get().columnsOrder);
                                }

                                // saving sort by
                                if (prev.sortBy !== entity.get().sortBy) {
                                    Storage.set(`table-${id}-sort-by`, entity.get().sortBy);
                                }

                                // saving sort desc
                                if (prev.sortDesc !== entity.get().sortDesc) {
                                    Storage.set(`table-${id}-sort-desc`, entity.get().sortDesc);
                                }
                            },
                },
            ]
        );
    }

    public static getInstance(id: string, defaults: TablePersistentDefaults): TableStoreSingleton {
        if (TableStoreSingleton.instance == null) {
            TableStoreSingleton.instance = {};
        }

        if (!TableStoreSingleton.instance[id]) {
            TableStoreSingleton.instance[id] = new TableStoreSingleton(id, defaults);
        }
        return TableStoreSingleton.instance[id];
    }

    public setSorting(sortBy: string, sortDesc: boolean) {
        this.store.set(
            produce((state: TablePersistentStore) => {
                state.sortBy = sortBy;
                state.sortDesc = sortDesc;
            })
        );
    }

    public clearSorting() {
        this.store.set(
            produce((state: TablePersistentStore) => {
                state.sortBy = "";
                state.sortDesc = false;
            })
        );
    }

    public setColumns(visibleColumns: string[], columnOrder: string[]) {
        this.store.set(
            produce((state: TablePersistentStore) => {
                state.visibleColumns = visibleColumns;
                state.columnsOrder = columnOrder;
            })
        );
    }

    public setColumnWidths(column: string, width: number) {
        this.store.set(
            produce((state: TablePersistentStore) => {
                state.columnWidths = { ...state.columnWidths, [column]: width };
            })
        );
    }
}

export const TablePersistentStore = (id: string, defaults: TablePersistentDefaults) =>
    TableStoreSingleton.getInstance(id, defaults);
