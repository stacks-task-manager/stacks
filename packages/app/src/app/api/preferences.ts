// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * User preferences (also available via boot; use for explicit refresh).
 */
import { IPreferences } from "@stacks/types";
import request from "./request";

export const PreferencesAPI = {
    /** GET preferences only. */
    async load(): Promise<IPreferences> {
        return request.get("/api/preferences");
    },
    /** PATCH full preferences blob. */
    async update(preferences: IPreferences): Promise<boolean> {
        return request.patch("/api/preferences", preferences);
    },
};
