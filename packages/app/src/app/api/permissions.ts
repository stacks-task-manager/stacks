// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Resource ACL updates by permission row id.
 */
import { IPermissions } from "@stacks/types";
import request from "./request";

export const PermissionsAPI = {
    /** PATCH sharing settings. */
    async update(id: string, permission: IPermissions): Promise<boolean> {
        const { isPublic, owner, visibleUsers, visibleRoles } = permission;
        return request.patch(`/api/permissions/${id}`, {
            isPublic,
            owner,
            visibleUsers,
            visibleRoles,
        });
    },

    /** PATCH owner transfer. */
    async transferOwner(id: string, owner: string): Promise<boolean> {
        return request.patch(`/api/permissions/${id}/owner`, { owner });
    },
};
