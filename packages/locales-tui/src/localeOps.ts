// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { PluralForms, TranslationValue } from "@stacks/translations";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, extname, join } from "path";

const EN = "en";

function sortKeysRecord(obj: Record<string, TranslationValue>): Record<string, TranslationValue> {
    const out: Record<string, TranslationValue> = {};
    for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
        out[k] = obj[k]!;
    }
    return out;
}

export function stringifyLocaleFile(obj: Record<string, TranslationValue>): string {
    return JSON.stringify(sortKeysRecord(obj), null, 4) + "\n";
}

function isPluralForms(v: TranslationValue): v is PluralForms {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Empty placeholder matching the shape of `v` (string → "", plural object → same keys, empty strings). */
export function emptyValueFor(v: TranslationValue): TranslationValue {
    if (typeof v === "string") return "";
    if (isPluralForms(v)) {
        const out: PluralForms = {};
        for (const k of Object.keys(v)) out[k] = "";
        return out;
    }
    return "";
}

export function readLocaleJson(path: string): Record<string, TranslationValue> | null {
    try {
        const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
        return raw as Record<string, TranslationValue>;
    } catch {
        return null;
    }
}

export function writeLocaleJson(path: string, data: Record<string, TranslationValue>): void {
    writeFileSync(path, stringifyLocaleFile(data), "utf8");
}

export function listLocaleJsonFiles(localesDir: string): string[] {
    if (!existsSync(localesDir)) return [];
    return readdirSync(localesDir)
        .filter(f => extname(f).toLowerCase() === ".json")
        .map(f => join(localesDir, f));
}

export function enJsonPath(localesDir: string): string {
    return join(localesDir, `${EN}.json`);
}

/** Map locale id (filename stem, lowercased) → absolute path. */
export function indexLocaleFilesById(localesDir: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const p of listLocaleJsonFiles(localesDir)) {
        const id = basename(p, ".json").toLowerCase();
        map.set(id, p);
    }
    return map;
}

type SyncResult = { file: string; keysFilled: number };

function isEmptyTranslationValue(v: TranslationValue): boolean {
    if (typeof v === "string") return v.trim() === "";
    if (isPluralForms(v)) {
        const keys = Object.keys(v);
        if (keys.length === 0) return true;
        return keys.every(k => {
            const s = v[k];
            return typeof s === "string" && s.trim() === "";
        });
    }
    return true;
}

/**
 * True if the string is a sync placeholder: `*English copy*` from sync, or legacy `(*) …`.
 */
export function isSyncPlaceholderString(s: string): boolean {
    const t = s.trimStart();
    if (t.startsWith("(*)")) return true;
    const u = s.trim();
    return u.length >= 2 && u.startsWith("*") && u.endsWith("*");
}

/**
 * Refill from English when missing, empty, or still a sync placeholder (so English edits can be re-synced).
 * Real translations are left alone.
 */
function shouldRefillFromEn(curVal: TranslationValue): boolean {
    if (isEmptyTranslationValue(curVal)) return true;
    if (typeof curVal === "string") return isSyncPlaceholderString(curVal);
    if (isPluralForms(curVal)) {
        const vals = Object.values(curVal).filter((s): s is string => typeof s === "string");
        if (vals.length === 0) return true;
        return vals.every(s => s.trim() === "" || isSyncPlaceholderString(s));
    }
    return false;
}

/**
 * Prefills a locale from English: each string becomes `*English text*` (or each plural slot), as a “translate this” hint.
 */
export function prefixedCopyFromEn(enVal: TranslationValue): TranslationValue {
    if (typeof enVal === "string") return `*${enVal}*`;
    if (isPluralForms(enVal)) {
        const out: PluralForms = {};
        for (const k of Object.keys(enVal)) {
            const s = enVal[k];
            out[k] = typeof s === "string" ? `*${s}*` : `**`;
        }
        return out;
    }
    return `**`;
}

/**
 * For every non-English locale file: for each English key, if the locale value is missing, empty,
 * or a sync placeholder (`*…*` or legacy `(*)…`), set it from English using the same `*…*` pattern.
 * Real translations are not overwritten.
 */
export function syncMissingKeysFromEn(localesDir: string): { results: SyncResult[]; errors: string[] } {
    const errors: string[] = [];
    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) {
        errors.push(`Missing or invalid ${enPath}`);
        return { results: [], errors };
    }

    const results: SyncResult[] = [];
    for (const [localeId, path] of indexLocaleFilesById(localesDir)) {
        if (localeId === EN) continue;
        const cur = readLocaleJson(path);
        if (!cur) {
            errors.push(`Invalid JSON: ${path}`);
            continue;
        }
        let keysFilled = 0;
        const next = { ...cur };
        for (const key of Object.keys(en)) {
            const enVal = en[key]!;
            const curVal = next[key];
            if (curVal === undefined || shouldRefillFromEn(curVal)) {
                next[key] = prefixedCopyFromEn(enVal);
                keysFilled++;
            }
        }
        if (keysFilled > 0) {
            writeLocaleJson(path, next);
        }
        results.push({ file: path, keysFilled });
    }
    return { results, errors };
}

export type AddLanguageResult = { path: string } | { error: string };

/**
 * Creates `<locale>.json` with every key from English; values empty (or empty plural shapes).
 */
export function addLanguageFile(localesDir: string, localeIdRaw: string): AddLanguageResult {
    const localeId = localeIdRaw.trim().toLowerCase();
    if (!localeId || localeId === EN) {
        return { error: "Locale id must be non-empty and not `en`." };
    }
    if (!/^[a-z0-9_-]+$/.test(localeId)) {
        return { error: "Locale id: use lowercase letters, digits, hyphen, underscore only." };
    }

    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) {
        return { error: `Missing or invalid English file: ${enPath}` };
    }

    const outPath = join(localesDir, `${localeId}.json`);
    if (existsSync(outPath)) {
        return { error: `File already exists: ${outPath}` };
    }

    const next: Record<string, TranslationValue> = {};
    for (const key of Object.keys(en)) {
        next[key] = emptyValueFor(en[key]!);
    }
    writeLocaleJson(outPath, next);
    return { path: outPath };
}

export type RenameWarning = { file: string; message: string };

/**
 * Renames JSON property `oldKey` → `newKey` in `en.json` and all other locale files.
 * If `newKey` already exists in a non-en file, that file is skipped (no data loss); a warning is returned.
 */
export function renameKeyAcrossLocales(
    localesDir: string,
    oldKey: string,
    newKey: string,
    newEnValue: TranslationValue,
): { warnings: RenameWarning[] } {
    const warnings: RenameWarning[] = [];
    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) throw new Error(`Invalid ${enPath}`);
    if (!(oldKey in en)) throw new Error(`Missing key in English: ${oldKey}`);
    if (oldKey === newKey) {
        en[oldKey] = newEnValue;
        writeLocaleJson(enPath, sortKeysRecord(en));
        return { warnings };
    }
    if (newKey in en) {
        throw new Error(`English file already has key: ${newKey}`);
    }

    en[newKey] = newEnValue;
    delete en[oldKey];
    writeLocaleJson(enPath, sortKeysRecord(en));

    for (const [localeId, path] of indexLocaleFilesById(localesDir)) {
        if (localeId === EN) continue;
        const cur = readLocaleJson(path);
        if (!cur) {
            warnings.push({ file: path, message: "Skipped (invalid JSON)" });
            continue;
        }
        if (newKey in cur && oldKey in cur) {
            warnings.push({
                file: path,
                message: `Target key "${newKey}" already exists; left file unchanged (still has both keys).`,
            });
            continue;
        }
        if (newKey in cur && !(oldKey in cur)) {
            warnings.push({
                file: path,
                message: `Target key "${newKey}" already exists; skipped rename.`,
            });
            continue;
        }
        if (oldKey in cur) {
            const val = cur[oldKey]!;
            const next = { ...cur };
            delete next[oldKey];
            next[newKey] = val;
            writeLocaleJson(path, sortKeysRecord(next));
        }
    }

    return { warnings };
}

/**
 * Removes `key` from `en.json` and from every other locale file that contains it.
 * The key must exist in English (source of truth).
 */
export function deleteKeyAcrossLocales(
    localesDir: string,
    key: string,
): { removedFromOtherLocaleFiles: number } {
    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) throw new Error(`Invalid ${enPath}`);
    if (!(key in en)) throw new Error(`Missing key in English: ${key}`);
    delete en[key];
    writeLocaleJson(enPath, sortKeysRecord(en));

    let removedFromOtherLocaleFiles = 0;
    for (const [localeId, path] of indexLocaleFilesById(localesDir)) {
        if (localeId === EN) continue;
        const cur = readLocaleJson(path);
        if (!cur) continue;
        if (key in cur) {
            delete cur[key];
            writeLocaleJson(path, sortKeysRecord(cur));
            removedFromOtherLocaleFiles++;
        }
    }
    return { removedFromOtherLocaleFiles };
}

export function addEnglishEntry(localesDir: string, key: string, value: TranslationValue): void {
    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) throw new Error(`Invalid ${enPath}`);
    if (key in en) throw new Error(`Key already exists: ${key}`);
    en[key] = value;
    writeLocaleJson(enPath, sortKeysRecord(en));
}

export function updateEnglishValue(localesDir: string, key: string, value: TranslationValue): void {
    const enPath = enJsonPath(localesDir);
    const en = readLocaleJson(enPath);
    if (!en) throw new Error(`Invalid ${enPath}`);
    if (!(key in en)) throw new Error(`Missing key: ${key}`);
    en[key] = value;
    writeLocaleJson(enPath, sortKeysRecord(en));
}

export function updateLocaleValue(
    localesDir: string,
    localeId: string,
    key: string,
    value: TranslationValue,
): void {
    const map = indexLocaleFilesById(localesDir);
    const path = map.get(localeId.toLowerCase());
    if (!path) {
        throw new Error(`Locale file not found for "${localeId}" under ${localesDir}`);
    }
    const cur = readLocaleJson(path);
    if (!cur) throw new Error(`Invalid ${path}`);
    if (!(key in cur)) throw new Error(`Missing key in ${localeId}: ${key}`);
    cur[key] = value;
    writeLocaleJson(path, sortKeysRecord(cur));
}

/** String values for similarity / listing (plural forms → JSON). */
export function flattenEnStringValues(en: Record<string, TranslationValue>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(en)) {
        out[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    return out;
}
