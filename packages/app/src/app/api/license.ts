// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * SPA bootstrap: license, translations, preferences, optional AI chat flags.
 */
import { ILicense, IPreferences } from "@stacks/types";
import request from "./request";
import { TranslationValue } from "@stacks/translations";

/** Public AI chat settings exposed at boot. */
export type AiChatBootConfig = {
    enabled: boolean;
    model: string | null;
};

export const BootAPI = {
    /** GET `/api/boot` aggregated payload. */
    async load(): Promise<{
        license: ILicense;
        translations: Record<string, TranslationValue>;
        preferences: IPreferences;
        aiChat?: AiChatBootConfig;
    }> {
        return request.get("/api/boot");
    },
};