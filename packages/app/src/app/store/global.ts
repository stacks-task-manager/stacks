// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Cross-cutting UI toggles (preferences dialog, etc.).
 */
import { produce } from "immer";

import Storage from "app/utils/storage";
import { entity } from "app/hooks/store";
import { IPermissions } from "@stacks/types";

interface IGlobalStore {
    isSidebarVisible: boolean;
    isPreferencesVisible: boolean;
    isNewTaskVisible: boolean;
    isNewBookmarkVisible: boolean;
    permissions?: IPermissions;
    permissionsCallback?: (permissions: IPermissions) => void;
}

const defaultGlobalStore: IGlobalStore = {
    isSidebarVisible: true,
    isPreferencesVisible: false,
    isNewTaskVisible: false,
    isNewBookmarkVisible: false,
};

const savedGlobalStore: IGlobalStore = Storage.get<IGlobalStore>("global", true, defaultGlobalStore);
export const GlobalStore = entity<IGlobalStore>({ ...savedGlobalStore, isPreferencesVisible: false });

export const togglePreferences = (forceState?: boolean) => {
    GlobalStore.set(
        produce((state: IGlobalStore) => {
            if (typeof forceState !== "undefined") {
                state.isPreferencesVisible = forceState;
            } else {
                state.isPreferencesVisible = !state.isPreferencesVisible;
            }
        })
    );
};

export const toggleSidebar = (forceState?: boolean) => {
    GlobalStore.set(
        produce((state: IGlobalStore) => {
            if (typeof forceState !== "undefined") {
                state.isSidebarVisible = forceState;
            } else {
                state.isSidebarVisible = !state.isSidebarVisible;
            }
        })
    );

    savePersistency();
};

export const toggleNewTask = () => {
    GlobalStore.set(
        produce((state: IGlobalStore) => {
            state.isNewTaskVisible = !state.isNewTaskVisible;
        })
    );
};

export const toggleNewBookmark = () => {
    GlobalStore.set(
        produce((state: IGlobalStore) => {
            state.isNewBookmarkVisible = !state.isNewBookmarkVisible;
        })
    );
};

export const showPermissions = (permissions: IPermissions, callback: (permissions: IPermissions) => void) => {
    GlobalStore.set(
        produce((state: IGlobalStore) => {
            state.permissions = permissions;
            state.permissionsCallback = (newPermissions: IPermissions) => {
                callback(newPermissions);

                GlobalStore.set(
                    produce((state: IGlobalStore) => {
                        state.permissions = newPermissions;
                    })
                );
            };
        })
    );
};

export const hidePermissions = () => {
    GlobalStore.set(
        produce((state: IGlobalStore) => {
            state.permissions = undefined;
            state.permissionsCallback = undefined;
        })
    );
};

const savePersistency = () => {
    Storage.set("global", GlobalStore.get());
};
