// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Preferences hooks and selectors.
 */
import { useCallback } from "react";

import { IPreferences } from "@stacks/types";
import { PreferencesStore } from "app/store/preferences";
import { shallowEqual, useEntity } from "./store";

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

export const getPreference = (key: keyof IPreferences) => {
    const preferences = PreferencesStore.get();
    return preferences[key];
};
