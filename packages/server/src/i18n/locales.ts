// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { setTranslations, TranslationValue } from "@stacks/translations";
import { existsSync, readdirSync, readFileSync } from "fs";
import { basename, extname, join } from "path";

const localesRoot = () => join(process.cwd(), "locales");
const serverLocalesDir = () => join(localesRoot(), "server");
const appLocalesDir = () => join(localesRoot(), "app");

/** Default locale id (matches `en.json` under `locales/server` and `locales/app`). Passed to `setTranslations` with `{ locale }` so `Intl.PluralRules` uses English for global/off-request `translate()`. */
const DEFAULT_LOCALE = "en";

/** Server API / middleware strings: missing keys fall back to `locales/server/en.json`. */
const mergedServerByLocale = new Map<string, Record<string, TranslationValue>>();
/** Client UI strings (e.g. boot payload): missing keys fall back to `locales/app/en.json`. */
const mergedAppByLocale = new Map<string, Record<string, TranslationValue>>();

let englishServerMap: Record<string, TranslationValue> = {};
let englishAppMap: Record<string, TranslationValue> = {};

function mergeWithEnglishServer(primary: Record<string, TranslationValue>): Record<string, TranslationValue> {
    return { ...englishServerMap, ...primary };
}

function mergeWithEnglishApp(primary: Record<string, TranslationValue>): Record<string, TranslationValue> {
    return { ...englishAppMap, ...primary };
}

function readLocaleFile(path: string): Record<string, TranslationValue> | null {
    try {
        const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            console.warn(`[locale] Expected a JSON object in ${path}`);
            return null;
        }
        return raw as Record<string, TranslationValue>;
    } catch (e) {
        console.warn(`[locale] Error reading ${path}: ${e}`);
        return null;
    }
}

function loadFamily(
    dir: string,
    label: string,
    mergeWithEnglish: (p: Record<string, TranslationValue>) => Record<string, TranslationValue>,
    setEnglish: (m: Record<string, TranslationValue>) => void,
    target: Map<string, Record<string, TranslationValue>>
): void {
    if (!existsSync(dir)) {
        console.warn(`[locale] Directory not found: ${dir}`);
        return;
    }

    const files = readdirSync(dir).filter(f => extname(f).toLowerCase() === ".json");
    const enPath = join(dir, `${DEFAULT_LOCALE}.json`);
    if (!existsSync(enPath)) {
        console.warn(`[locale] Required ${label} file missing: ${enPath}`);
        return;
    }

    const enRaw = readLocaleFile(enPath);
    if (!enRaw) return;

    setEnglish(enRaw);
    target.clear();
    target.set(DEFAULT_LOCALE, mergeWithEnglish(enRaw));

    for (const file of files) {
        const stem = basename(file, ".json");
        if (stem === DEFAULT_LOCALE) continue;
        const path = join(dir, file);
        const raw = readLocaleFile(path);
        if (raw) {
            target.set(stem.toLowerCase(), mergeWithEnglish(raw));
        }
    }
}

/**
 * Loads `locales/server/*.json` and `locales/app/*.json` once at startup.
 * Server maps are used for `translate()` / middleware; app maps for the client boot payload.
 * Sets the global default to English server strings (for code outside request scope).
 */
export function preloadLocales(): void {
    if (!existsSync(localesRoot())) {
        console.warn(`[locale] Directory not found: ${localesRoot()}`);
        setTranslations({}, { locale: DEFAULT_LOCALE });
        return;
    }

    loadFamily(serverLocalesDir(), "server", mergeWithEnglishServer, m => {
        englishServerMap = m;
    }, mergedServerByLocale);

    loadFamily(appLocalesDir(), "app", mergeWithEnglishApp, m => {
        englishAppMap = m;
    }, mergedAppByLocale);

    if (mergedServerByLocale.size === 0) {
        setTranslations({}, { locale: DEFAULT_LOCALE });
        return;
    }

    const defaultServerMap = mergedServerByLocale.get(DEFAULT_LOCALE) ?? {};
    setTranslations(defaultServerMap, { locale: DEFAULT_LOCALE });
}

/** Preferred locale id matching `locales/server/<id>.json` basename (e.g. `en`, `de`). */
export function pickLocale(acceptLanguage: string | undefined): string {
    if (!acceptLanguage?.trim()) return DEFAULT_LOCALE;

    for (const part of acceptLanguage.split(",")) {
        const tag = part.split(";")[0]?.trim().toLowerCase();
        if (!tag) continue;

        if (mergedServerByLocale.has(tag)) return tag;

        const primary = tag.split("-")[0];
        if (mergedServerByLocale.has(primary)) return primary;

        if (primary.length >= 2) {
            const short = primary.slice(0, 2);
            if (mergedServerByLocale.has(short)) return short;
        }
    }

    return DEFAULT_LOCALE;
}

export function getMergedTranslationsForLocale(locale: string): Record<string, TranslationValue> {
    const key = locale.toLowerCase();
    return mergedServerByLocale.get(key) ?? mergedServerByLocale.get(DEFAULT_LOCALE) ?? {};
}

/** UI strings for `/boot` and similar; falls back to English app copy when a locale file is missing. */
export function getMergedAppTranslationsForLocale(locale: string): Record<string, TranslationValue> {
    const key = locale.toLowerCase();
    return mergedAppByLocale.get(key) ?? mergedAppByLocale.get(DEFAULT_LOCALE) ?? {};
}
