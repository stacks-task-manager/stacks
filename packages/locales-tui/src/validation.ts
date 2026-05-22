// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** Mirrors `TRANSLATION_KEY_PATTERN` / `isValidTranslationKey` from `@stacks/translations`. */
const TRANSLATION_KEY_PATTERN = /^[A-Za-z0-9_ ]+$/;

/**
 * Maximum length (UTF-16 code units, same as `String.length`) for a locale JSON object key in this project.
 *
 * **JSON:** RFC 8259 / ECMA-404 do **not** define a maximum string length, so a key cannot become “invalid JSON”
 * merely from length until you hit an implementation limit.
 *
 * **JavaScript / V8 (Node):** strings are bounded by the engine (on the order of hundreds of millions of code
 * units — far above normal translation keys). `JSON.stringify` / `JSON.parse` use those same limits.
 *
 * This cap is a **practical** guardrail so locale files stay readable, diffs stay sane, and keys stay suitable
 * as `translate("…")` arguments.
 */
export const MAX_LOCALE_KEY_LENGTH = 8192;

export function isValidLocaleKey(key: string): boolean {
    if (key.length === 0 || key !== key.trim()) return false;
    return TRANSLATION_KEY_PATTERN.test(key);
}

export function isLocaleKeyWithinMaxLength(key: string): boolean {
    return key.length <= MAX_LOCALE_KEY_LENGTH;
}
