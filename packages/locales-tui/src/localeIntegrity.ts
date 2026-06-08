// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL-3.0-only. See LICENSE.
import type { TranslationValue } from "@stacks/translations";
import { readLocaleJson, indexLocaleFilesById, enJsonPath } from "./localeOps.js";
import type { TranslationSection } from "./sections.js";

/** A set of keys that share the same translation value in a locale file. */
export type DuplicateValueEntry = {
    localeId: string;
    filePath: string;
    value: string;
    keys: string[];
};

/** A locale file with keys that differ from English. */
export type KeyMismatchEntry = {
    localeId: string;
    filePath: string;
    missingKeys: string[]; // in en.json but not in this locale file
    extraKeys: string[];   // in this locale file but not in en.json
};

/** A value that is similar (>= threshold %) to another value in the same file. */
export type NearDuplicateEntry = {
    localeId: string;
    filePath: string;
    candidateKey: string;
    candidateValue: string;
    similarEntries: { entryKey: string; entryValue: string; similarity: number }[];
};

/** Combined integrity report for a single section. */
export type LocaleIntegrityReport = {
    sectionId: string;
    duplicateValues: DuplicateValueEntry[];
    keyMismatches: KeyMismatchEntry[];
    nearDuplicates: NearDuplicateEntry[];
};

/** Convert a TranslationValue to a comparable string. */
function valueToString(v: TranslationValue): string {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
}

/**
 * Find all values that appear under more than one key in a locale file.
 * Plural forms are compared by their JSON string representation.
 */
export function findDuplicateValues(
    localeId: string,
    filePath: string,
    data: Record<string, TranslationValue>,
): DuplicateValueEntry[] {
    const groups = new Map<string, string[]>();

    for (const [key, value] of Object.entries(data)) {
        const s = valueToString(value);
        const existing = groups.get(s);
        if (existing) {
            existing.push(key);
        } else {
            groups.set(s, [key]);
        }
    }

    const duplicates: DuplicateValueEntry[] = [];
    for (const [value, keys] of groups) {
        if (keys.length > 1) {
            duplicates.push({ localeId, filePath, value, keys });
        }
    }
    return duplicates;
}

/**
 * Compare every non-English locale file against en.json.
 * Returns entries for keys that are missing from or extra in a non-en file.
 */
export function findKeyMismatches(
    localesDir: string,
): KeyMismatchEntry[] {
    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) return [];

    const enKeys = new Set(Object.keys(en));
    const mismatches: KeyMismatchEntry[] = [];

    for (const [localeId, filePath] of indexLocaleFilesById(localesDir)) {
        if (localeId === "en") continue;
        const data = readLocaleJson(filePath);
        if (!data) continue;

        const localeKeys = new Set(Object.keys(data));

        const missingKeys: string[] = [];
        const extraKeys: string[] = [];

        for (const key of enKeys) {
            if (!localeKeys.has(key)) missingKeys.push(key);
        }
        for (const key of localeKeys) {
            if (!enKeys.has(key)) extraKeys.push(key);
        }

        if (missingKeys.length > 0 || extraKeys.length > 0) {
            mismatches.push({ localeId, filePath, missingKeys, extraKeys });
        }
    }
    return mismatches;
}

/**
 * For a single locale file, find values that are similar (>= threshold %)
 * to other values in the same file.
 */
export function findNearDuplicates(
    localeId: string,
    filePath: string,
    data: Record<string, TranslationValue>,
    threshold: number = 85,
): NearDuplicateEntry[] {
    const entries = Object.entries(data);
    const results: NearDuplicateEntry[] = [];

    for (const [candidateKey, candidateValue] of entries) {
        const candidateStr = valueToString(candidateValue);
        const similarEntries: { entryKey: string; entryValue: string; similarity: number }[] = [];

        for (const [entryKey, entryValue] of entries) {
            if (entryKey === candidateKey) continue;
            const entryStr = valueToString(entryValue);
            const sim = Math.round(100 * (1 - levenshtein(candidateStr, entryStr) / Math.max(candidateStr.length, entryStr.length, 1)));
            if (sim >= threshold) {
                similarEntries.push({ entryKey, entryValue: entryStr, similarity: sim });
            }
        }

        if (similarEntries.length > 0) {
            results.push({ localeId, filePath, candidateKey, candidateValue: candidateStr, similarEntries });
        }
    }

    return results;
}

/**
 * Run all three checks across all locale files in a section.
 */
export function checkLocaleIntegrity(
    section: TranslationSection,
    localesDir: string,
    nearDuplicateThreshold: number = 85,
): LocaleIntegrityReport {
    const duplicateValues: DuplicateValueEntry[] = [];
    const nearDuplicates: NearDuplicateEntry[] = [];

    const localeFiles = indexLocaleFilesById(localesDir);
    for (const [localeId, filePath] of localeFiles) {
        const data = readLocaleJson(filePath);
        if (!data) continue;

        duplicateValues.push(...findDuplicateValues(localeId, filePath, data));
        nearDuplicates.push(...findNearDuplicates(localeId, filePath, data, nearDuplicateThreshold));
    }

    const keyMismatches = findKeyMismatches(localesDir);

    return {
        sectionId: section.id,
        duplicateValues,
        keyMismatches,
        nearDuplicates,
    };
}

// Minimal Levenshtein distance (reused from similarity.ts, kept inline to avoid circular deps)
function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const row = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) row[j] = j;

    for (let i = 1; i <= a.length; i++) {
        let prev = i - 1;
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = row[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
            prev = tmp;
        }
    }
    return row[b.length]!;
}
