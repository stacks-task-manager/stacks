// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Binds locale from `Accept-Language` and merged translation map per request (skips static paths).
 */
import { MiddlewareHandler } from "hono/types";
import { runWithRequestTranslations } from "../i18n/requestScope";
import { getMergedTranslationsForLocale, pickLocale } from "../i18n/locales";

const SKIPPED_PATH_PREFIXES = ["/static", "/.well-known"];

/** Sets `locale` on context and runs the remainder inside {@link runWithRequestTranslations}. */
export const translations: MiddlewareHandler = async (c, next) => {
    for (const prefix of SKIPPED_PATH_PREFIXES) {
        if (c.req.path.startsWith(prefix)) {
            return next();
        }
    }

    const locale = pickLocale(c.req.header("accept-language"));
    const map = getMergedTranslationsForLocale(locale);
    c.set("locale", locale);
    return runWithRequestTranslations(locale, map, () => next());
};
