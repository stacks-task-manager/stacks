// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { TranslationValue } from "@stacks/translations";
import { isSyncPlaceholderString } from "./localeOps.js";

function displayValueForFilter(v: TranslationValue): string {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
}

/** True if there is no real translation yet (empty, sync placeholder `*…*` / `(*)…`, or all plural slots likewise). */
export function isUntranslatedValue(v: TranslationValue | undefined): boolean {
    if (v === undefined) return true;
    if (typeof v === "string") return v.trim() === "" || isSyncPlaceholderString(v);
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const vals = Object.values(v as Record<string, unknown>).filter((x): x is string => typeof x === "string");
        if (vals.length === 0) return true;
        return vals.every(x => x.trim() === "" || isSyncPlaceholderString(x));
    }
    return true;
}

/**
 * Applies untranslated-only and substring search (key or value text) on a sorted key list.
 */
export function filterBrowseKeys(
    sortedKeys: string[],
    map: Record<string, TranslationValue>,
    searchQuery: string,
    untranslatedOnly: boolean,
): string[] {
    let out = sortedKeys;
    if (untranslatedOnly) {
        out = out.filter(k => isUntranslatedValue(map[k]));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
        out = out.filter(k => {
            const dv = displayValueForFilter(map[k]!).toLowerCase();
            return k.toLowerCase().includes(q) || dv.includes(q);
        });
    }
    return out;
}
