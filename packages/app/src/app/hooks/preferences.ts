// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Preferences hooks and selectors.
 */
import { useCallback } from "react";

import { IPreferences } from "@stacks/types";
import { PreferencesStore } from "app/store/preferences";
import { shallowEqual, useEntity } from "./store";

/**
 * Subscribes to the given preference keys and returns their current values.
 * @param {Array<keyof IPreferences>} props - The preference keys to select.
 * @returns A partial preferences object containing only the requested keys.
 */
export const usePreferences = (props: Array<keyof IPreferences>): Partial<IPreferences> => {
    const preferences = useEntity(
        PreferencesStore,
        useCallback(
            (state: IPreferences) => {
                return props.reduce((res, key) => ({ ...res, [key]: state[key] }), {});
            },
            [props]
        ),
        shallowEqual
    );

    return preferences;
};

/**
 * Synchronously reads a single preference value from the preferences store.
 * @param {keyof IPreferences} key - The preference key to read.
 * @returns The value stored for the given preference key.
 */
export const getPreference = (key: keyof IPreferences) => {
    const preferences = PreferencesStore.get();
    return preferences[key];
};
