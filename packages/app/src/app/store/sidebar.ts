// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Collapsible sidebar tree and pins.
 */
import { entity } from "app/hooks/store";
import { produce } from "immer";

import Storage from "app/utils/storage";
import { NodeModel } from "@minoru/react-dnd-treeview";

export interface ISidebarStore {
    openedFolders: string[];
    selectedRecord: null | string;
    editingRecord: null | string;
}

const restoreOpenedFolders = () => {
    return Storage.get("openedFolders", true, []);
};

export const SidebarStore = entity<ISidebarStore>({
    openedFolders: restoreOpenedFolders(),
    selectedRecord: null,
    editingRecord: null,
});

const saveOpenedFolders = () => {
    Storage.set("openedFolders", SidebarStore.get().openedFolders);
};

export const setOpenFolders = (folders: NodeModel["id"][]) => {
    SidebarStore.set(
        produce((state: ISidebarStore) => {
            state.openedFolders = folders as string[];
        })
    );
    saveOpenedFolders();
};

export const setSelectedRecord = (recordId: null | string) => {
    SidebarStore.set(
        produce((state: ISidebarStore) => {
            state.selectedRecord = recordId;
        })
    );
};

export const setEditingRecord = (recordId: null | string) => {
    SidebarStore.set(
        produce((state: ISidebarStore) => {
            state.editingRecord = recordId;
        })
    );
};

export const setUnselectAll = () => {
    SidebarStore.set(
        produce((state: ISidebarStore) => {
            state.editingRecord = null;
            state.selectedRecord = null;
        })
    );
};
