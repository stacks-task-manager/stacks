// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Collapsible sidebar tree and pins.
 */
import { entity } from "app/hooks/store";
import { produce } from "immer";

import Storage from "app/utils/storage";

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

export const setOpenFolders = (folders: string[]) => {
    SidebarStore.set(
        produce((state: ISidebarStore) => {
            state.openedFolders = folders;
        })
    );
    saveOpenedFolders();
};

/** Opens a folder in the sidebar (deduped, persisted). */
export const openFolder = (folderId: string) => {
    const current = SidebarStore.get().openedFolders;
    setOpenFolders(current.includes(folderId) ? current : [...current, folderId]);
};

/**
 * Re-reads the opened folders for the authenticated storage namespace. Module initialization runs
 * before `setStorageTenant`, so the initial value can only be a pre-login default.
 */
export const loadOpenedFolders = () => {
    SidebarStore.set(
        produce((state: ISidebarStore) => {
            state.openedFolders = restoreOpenedFolders();
        })
    );
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
