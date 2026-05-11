// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Per-user UI preferences merged with {@link defaultPreferences}.
 */
import { PreferenceEntity } from "@stacks/db";
import { defaultPreferences } from "@stacks/types";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { sanitizeWhere } from "./utils";

/** Raw Sequelize entity for the current user, or null. */
async function getEntity() {
    const user = getCurrentUser();
    try {
        const preference = await PreferenceEntity.findOne({
            where: sanitizeWhere({
                userId: user.id,
            }),
        });

        return preference;
    } catch (e) {
        return null;
    }
}

/** Merged preferences object for boot and PATCH responses. */
async function get() {
    const user = getCurrentUser();
    try {
        const preference = await PreferenceEntity.findOne({
            where: sanitizeWhere({
                userId: user.id,
            }),
        });

        return preference
            ? { ...defaultPreferences, ...(preference.toJSON().preferences as Record<string, unknown>) }
            : { ...defaultPreferences };
    } catch (e) {
        return { ...defaultPreferences };
    }
}

/** Replaces or inserts the JSON blob for the signed-in user. */
async function update(data: any) {
    const user = getCurrentUser();
    try {
        const preferences = await getEntity();
        if (preferences) {
            const [affectedCount] = await PreferenceEntity.update(
                { preferences: data },
                {
                    where: sanitizeWhere({ userId: user.id }),
                }
            );

            invalidateApiCacheForCurrentRequest();
            return affectedCount > 0;
        }

        await PreferenceEntity.create({
            userId: user.id,
            preferences: data,
            tenant: user.tenant,
            createdBy: user.id,
            updatedBy: user.id,
        });

        invalidateApiCacheForCurrentRequest();
        return true;
    } catch (error) {
        throw error;
    }
}

export const PreferencesLoader = {
    get,
    update,
};
