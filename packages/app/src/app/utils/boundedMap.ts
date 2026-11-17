// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

/** Stores a bounded number of enabled values; disabled values are removed entirely. */
export function setBoundedMapValue<K, V>(map: Map<K, V>, key: K, value: V | false, limit: number) {
    if (value === false) {
        map.delete(key);
        return;
    }

    map.delete(key);
    map.set(key, value);

    while (map.size > Math.max(0, limit)) {
        const oldestKey = map.keys().next().value;
        if (oldestKey === undefined) break;
        map.delete(oldestKey);
    }
}
