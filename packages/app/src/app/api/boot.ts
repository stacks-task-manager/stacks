// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * SPA bootstrap: aggregated `/api/boot` payload (license, translations, preferences, optional flags).
 */
import { ILicense, IPreferences } from "@stacks/types";
import request from "./request";
import { TranslationValue } from "@stacks/translations";

/** Public AI chat settings exposed at boot. */
export type AiChatBootConfig = {
    enabled: boolean;
    model: string | null;
};

export type IntegrationsBootConfig = {
    google?: {
        isAuthenticated: boolean;
    };
};

export const BootAPI = {
    /** GET `/api/boot` aggregated payload. */
    async load(): Promise<{
        license: ILicense;
        translations: Record<string, TranslationValue>;
        preferences: IPreferences;
        aiChat?: AiChatBootConfig;
        integrations?: IntegrationsBootConfig;
    }> {
        return request.get("/api/boot");
    },
};
