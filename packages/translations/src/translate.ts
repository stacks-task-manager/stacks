// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Isomorphic i18n: no Node APIs here.
 *
 * - **Browser:** call `setTranslations` once; `translate` reads that global map.
 * - **Server:** register a per-request context with `registerTranslationContext` (see `@stacks/server` `requestScope.ts`);
 *   each request runs inside `AsyncLocalStorage` so concurrent locales never mix.
 */
import { interpolate, parseTemplate, type ParamValues, type Segment } from "./interpolation.js";
import { LRUCache } from "./lru.js";
import { pickPluralTemplate, type PluralForms } from "./plural.js";

/** Top-level translation ids: letters, digits, underscores, and spaces (no punctuation). */
export const TRANSLATION_KEY_PATTERN = /^[A-Za-z0-9_ ]+$/;

export function isValidTranslationKey(key: string): boolean {
    if (key.length === 0 || key !== key.trim()) return false;
    return TRANSLATION_KEY_PATTERN.test(key);
}

export type TranslationValue = string | PluralForms;

export type SetTranslationsOptions = {
    locale?: string;
};

/** Current `{ locale, translations }` when inside a registered scope (e.g. one HTTP request on the server). */
export type ActiveTranslationContext = {
    locale: string;
    translations: Record<string, TranslationValue>;
};

/**
 * Returns the active request scope, or `undefined` (browser and any code outside a scope).
 * The server sets this once at startup via `registerTranslationContext`.
 */
let readActiveContext: (() => ActiveTranslationContext | undefined) | undefined;

export function registerTranslationContext(
    getActive: () => ActiveTranslationContext | undefined
): void {
    readActiveContext = getActive;
}

let globalLocale = "en";
let globalTranslations: Record<string, TranslationValue> = {};

const templateSegments = new Map<string, Segment[]>();
const resultCache = new LRUCache<string, string>(500);

function isPluralForms(v: unknown): v is PluralForms {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
    const vals = Object.values(v as Record<string, unknown>);
    if (vals.length === 0) return false;
    return vals.every(x => typeof x === "string");
}

function validateKeys(map: Record<string, TranslationValue>): void {
    for (const key of Object.keys(map)) {
        if (!isValidTranslationKey(key)) {
            console.warn(
                `Invalid translation key "${key}": use only ASCII letters, digits, underscores, and spaces (no punctuation); no leading or trailing spaces.`
            );
        }
    }
}

function stableParamsKey(params: ParamValues | undefined): string {
    if (params === undefined || Object.keys(params).length === 0) return "";
    const keys = Object.keys(params).sort();
    const obj: Record<string, string | number | boolean> = {};
    for (const k of keys) {
        obj[k] = params[k];
    }
    return JSON.stringify(obj);
}

function getSegmentsForTemplate(cacheKey: string, template: string): Segment[] {
    const cached = templateSegments.get(cacheKey);
    if (cached) return cached;
    const segments = parseTemplate(template);
    templateSegments.set(cacheKey, segments);
    return segments;
}

function resolveTemplateString(
    translationKey: string,
    template: string,
    params: ParamValues | undefined
): string {
    const cacheKey = `${translationKey}\0${template}`;
    const segments = getSegmentsForTemplate(cacheKey, template);
    const rk = `${translationKey}\0${template}\0${stableParamsKey(params)}`;
    const hit = resultCache.get(rk);
    if (hit !== undefined) return hit;
    const out = interpolate(segments, params);
    resultCache.set(rk, out);
    return out;
}

function messages(): Record<string, TranslationValue> {
    return readActiveContext?.()?.translations ?? globalTranslations;
}

/**
 * Locale for plural rules: request scope if registered, else the last `setTranslations` locale.
 */
export function getLocale(): string {
    return readActiveContext?.()?.locale ?? globalLocale;
}

export function setTranslations(
    map: Record<string, TranslationValue>,
    options?: SetTranslationsOptions
): void {
    validateKeys(map);
    globalTranslations = { ...map };
    globalLocale = options?.locale ?? "en";
    templateSegments.clear();
    resultCache.clear();
}

export function getTranslations(): Readonly<Record<string, TranslationValue>> {
    return messages();
}

export function translate(key: string, params?: ParamValues): string {
    if (!isValidTranslationKey(key)) {
        console.warn(
            `Invalid translation key "${key}": use only ASCII letters, digits, underscores, and spaces (no punctuation); no leading or trailing spaces.`
        );
        return `❌ ${key.toUpperCase()}`;
    }
    const raw = messages()[key];
    if (raw === undefined) {
        return key.toUpperCase();
    }

    let template: string;
    if (typeof raw === "string") {
        template = raw;
    } else if (isPluralForms(raw)) {
        const countRaw = params?.count;
        const count =
            typeof countRaw === "number" ? countRaw : typeof countRaw === "string" ? Number(countRaw) : NaN;
        const n = Number.isFinite(count) ? count : 0;
        template = pickPluralTemplate(raw, n, getLocale());
    } else {
        return key.toUpperCase();
    }

    return resolveTemplateString(key, template, params);
}

