// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Storage hooks and selectors.
 */
import { useCallback, useState } from "react";

import Storage from "app/utils/storage";

/**
 * Reads a value from storage and keeps it in local state, persisting changes back to storage.
 * @template T - The type of the stored value.
 * @param {string} key - The storage key to read and write.
 * @param {boolean | ((value: string) => T)} parse - Whether to JSON-parse the raw value, or a parser function that converts it to T.
 * @param {T} defaultValue - The fallback value when nothing is stored.
 * @param {string} [prefix] - An optional namespace prefix for the storage key.
 * @returns A tuple of the current value and a setter that updates state and storage.
 */
export const useStorage = <T>(
    key: string,
    parse: boolean | ((value: string) => T),
    defaultValue: T,
    prefix?: string
): [T, (newValue: T) => void] => {
    const storedValue = Storage.get(key, parse, defaultValue, prefix);
    const [value, setValue] = useState<T>(storedValue ?? defaultValue);

    const setTheValue = useCallback((newValue: T) => {
        setValue(newValue);
        Storage.set(key, newValue, prefix);
    }, []);

    return [value, setTheValue];
};
