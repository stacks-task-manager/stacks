// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AsyncLocalStorage } from "async_hooks";
import { registerTranslationContext, type ActiveTranslationContext, type TranslationValue } from "@stacks/translations";

const byRequest = new AsyncLocalStorage<ActiveTranslationContext>();

registerTranslationContext(() => byRequest.getStore());

/**
 * Run `fn` with this request’s strings and locale. Node-only (not used by the web app bundle).
 */
export function runWithRequestTranslations<T>(
    locale: string,
    messages: Record<string, TranslationValue>,
    fn: () => T | Promise<T>
): T | Promise<T> {
    return byRequest.run({ locale, translations: messages }, fn);
}
