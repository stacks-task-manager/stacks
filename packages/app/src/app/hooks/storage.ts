// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Storage hooks and selectors.
 */
import { useCallback, useState } from "react";

import Storage from "app/utils/storage";

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
