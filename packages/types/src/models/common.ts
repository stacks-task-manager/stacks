// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPermissions } from "./permissions.js";

export interface ICommonBase {
    id: string;
    tenant: string;
    created: Date;
    updated: Date;
}

export interface ICommon extends ICommonBase {
    createdBy: string;
    updatedBy: string;
}

export interface ICommonWithPermissions extends ICommon {
    permissions: IPermissions;
}

/** Optional soft-delete fields on persisted entities (server / DB). */
export interface ICommonWithSoftDelete extends ICommon {
    deletedBy?: string;
    deleted?: Date | null;
}
