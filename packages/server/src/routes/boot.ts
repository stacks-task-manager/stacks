// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Client bootstrap: license, merged translations, preferences, and public AI chat config.
 */
import { Hono } from 'hono';
import { getLicense } from "@stacks/license";
import { asyncHandler } from '../utils/errorHandler';
import { getMergedAppTranslationsForLocale } from '../i18n/locales';

import type { Context } from 'hono';
import { PreferencesLoader } from '../loaders';
import { getAiChatPublicConfig } from '../ai/config';
import type { User } from '../types/user';
import googleOAuthService from '../services/googleOAuthService';

const boot = new Hono();

/** GET `/` — Aggregates data needed before the SPA loads. */
boot.get('/', asyncHandler(async (c: Context) => {
    const license = getLicense();
    const translations = getMergedAppTranslationsForLocale(c.get('locale'));
    const preferences = await PreferencesLoader.get();
    const aiChat = getAiChatPublicConfig();
    const user = c.get("user") as User;
    const googleAuthenticated = await googleOAuthService.hasValidTokens(user.id);

    return c.replySuccess({
        license,
        translations,
        preferences,
        aiChat,
        integrations: {
            google: {
                isAuthenticated: googleAuthenticated,
            },
        },
    });
}));

export default boot;
