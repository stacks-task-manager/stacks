// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Server document tree types and create payloads with permission pick.
 */
import type { RECORDTYPE, IPermissions } from "@stacks/types";
import type { ICommon } from "./common";

export interface IDocument extends ICommon {
    title: string;
    parent?: string;
    after?: string;
    type: RECORDTYPE;
    tint?: string;
    permissions: IPermissions;
}

/** Permissions body for document create (POST /documents, AI tools). Loader assigns id, type, and default owner. */
export type IDocumentCreatePermissions = Pick<IPermissions, "isPublic" | "visibleUsers" | "visibleRoles"> & {
    owner?: string;
};

export interface IDocumentCreate {
    title: string;
    type: RECORDTYPE;
    permissions: IDocumentCreatePermissions;
    parent?: string;
    data: any;
}
