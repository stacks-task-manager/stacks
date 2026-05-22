// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Public tenant lookup for registration (non-deleted, enabled only).
 */
import { TenantEntity } from "@stacks/db";

/** Returns tenant JSON or null when missing/disabled/deleted. */
async function getOne(id: string) {
    const tenant = await TenantEntity.findOne({
        where: {
            id,
            deleted: null,
            disabled: false,
        },
    });

    if (!tenant) {
        return null;
    }

    return tenant.toJSON();
}

export const TenantsLoader = {
    getOne,
};
