// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Document tree (folders, notepads, projects) and archive toggles.
 */
import { IPermissions, IRecords, RECORDTYPE, TreeNode } from "@stacks/types";
import request from "./request";

/** POST body for creating a document node. */
export interface NewDocument<T> {
    title: string;
    type: RECORDTYPE;
    parent?: string;
    permissions: Partial<IPermissions>;
    data?: T;
}

/** Optional filters when loading the workspace tree. */
interface DocumentsLoadParams {
    archived?: boolean;
}

export const DocumentsAPI = {
    /** GET documents + tags bundle. */
    async load(params?: DocumentsLoadParams): Promise<IRecords> {
        return request.get("/api/documents", { params });
    },
    /** Creates a document under a parent. */
    async add<T>(document: NewDocument<T>): Promise<TreeNode> {
        return request.post("/api/documents", document);
    },
    /** Deletes a document node. */
    async delete(documentId: string): Promise<boolean> {
        return request.delete(`/api/documents/${documentId}`);
    },
    /** PATCH rename, parent, order, etc. */
    async update(documentId: string, document: Partial<TreeNode>): Promise<boolean> {
        return request.patch(`/api/documents/${documentId}`, document);
    },
    /** Sets archived timestamp. */
    async archive(documentId: string): Promise<boolean> {
        return request.post(`/api/documents/${documentId}/archive`);
    },
    /** Clears archived timestamp. */
    async unarchive(documentId: string): Promise<boolean> {
        return request.post(`/api/documents/${documentId}/unarchive`);
    },
};
