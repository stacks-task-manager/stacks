// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { RoleEntity } from "@stacks/db";

/** Returns the only role public registration may assign. */
export function findPublicRegistrationRole(tenant: string) {
    return RoleEntity.findOne({
        where: { tenant, title: "User", disabled: false, deleted: null },
    });
}
