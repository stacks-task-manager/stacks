// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Resource ACL updates by permission row id.
 */
import { IPermissions } from "@stacks/types";
import request from "./request";

export const PermissionsAPI = {
    /** PATCH sharing settings. */
    async update(id: string, permission: IPermissions): Promise<boolean> {
        return request.patch(`/api/permissions/${id}`, permission);
    },
};
