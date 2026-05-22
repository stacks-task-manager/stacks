// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import Log from "app/utils/log";
import { getCookie } from "./cookie";

// by default will prepend the current workspace id unless it's a global key
const GLOBAL_KEYS = [
    "global",
    "preferences",
    "license",
    "sidebar-width",
    "announcements",
    "last-version",
    "appFeedback",
    "appSurvey",
    "eula",
];
const getKey = (key: string, prefix?: string) => {
    if (GLOBAL_KEYS.includes(key)) return key;
    const tenant = getCookie("tenant");
    const thePrefix = prefix ? `${prefix}_` : "";
    return `${tenant}/${thePrefix}${key}`;
};

/**
 *
 * @param key The name of the key for storage
 * @param parse Wether to parse the data using JSON.parse or a custom function
 * @param defaultValue The default value returned in case it's empty
 * @returns
 */
const get = <T>(key: string, parse?: boolean | ((value: string) => T), defaultValue?: T, prefix?: string) => {
    const theKey = getKey(key, prefix);

    let rawStorage: string | null = null;
    rawStorage = window.localStorage.getItem(theKey);

    if (!rawStorage) return defaultValue;
    if (!parse) return rawStorage;

    if (typeof parse === "function") return parse(rawStorage);

    try {
        return JSON.parse(rawStorage);
    } catch (e) {
        Log.warn("Storage", "Unable to parse storage data", theKey, rawStorage);
    }

    return defaultValue;
};

/**
 *
 * @param key The name of the key for storage
 * @param value The value saved in the key
 */
const set = <T>(key: string, value: T, prefix?: string) => {
    const theKey = getKey(key, prefix);

    window.localStorage.setItem(theKey, typeof value === "string" ? value : JSON.stringify(value));
};

const remove = (key: string, prefix?: string) => {
    const theKey = getKey(key, prefix);

    window.localStorage.removeItem(theKey);
};

const list = () => {
    return Object.keys(window.localStorage);
};

export const setStorage = <T>(key: string, value: T) => set<T>(key, value);

export const getStorage = <T>(key: string, parse: boolean | ((value: string) => T), defaultValue: T) =>
    get<T>(key, parse, defaultValue);

export default {
    get,
    set,
    remove,
    list,
};
