// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Persist preferences to API and locale side effects.
 */
import { produce } from "immer";

import { PreferencesStore } from "../preferences";
import { IPreferences } from "@stacks/types";
import { PreferencesAPI } from "app/api";
import { setDateFnsLocale } from "app/utils/date";

const set = async (preferences: IPreferences) => {
    PreferencesStore.set(preferences);

    await setDateFnsLocale(preferences.dateLocale);
    return preferences;
};

let saveDebounce: NodeJS.Timeout | null = null;
const update = (key: keyof IPreferences, value: IPreferences[keyof IPreferences]) => {
    if (PreferencesStore.get()?.[key] === value) return;
    PreferencesStore.set(produce((state: IPreferences) => Object.assign(state, { [key]: value })));

    if (saveDebounce) {
        clearTimeout(saveDebounce);
        saveDebounce = null;
    }

    saveDebounce = setTimeout(async () => {
        await PreferencesAPI.update(PreferencesStore.get());
    }, 300);
};

export const PreferencesActions = {
    set,
    update,
};
