// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * File upload and attachment store sync.
 */
import { FilesAPI } from "app/api";
import { FILES_TYPE, IAttachment } from "@stacks/types";
import { openInNewTab } from "app/utils/browser";

const load = async (resourceId: string, type: FILES_TYPE): Promise<IAttachment[]> => {
    return await FilesAPI.load(resourceId, type);
};

const remove = async (attachmentId: string) => {
    return await FilesAPI.deleteByAttachment(attachmentId);
};

const download = (attachmentId: string) => {
    openInNewTab("/api/files/download/" + attachmentId);
};

const preview = (attachmentId: string) => {
    openInNewTab("/api/files/preview/" + attachmentId + "?size=preview");
};

const removeByRecord = async (recordId: string, type?: FILES_TYPE) => {
    return await FilesAPI.deleteByRecord(recordId, type);
};

const rename = async (newName: string, oldName: string, resource: string) => {
    // return await FilesAPI.rename(newName, resource);
    console.log("FILE RENAME NOT YET IMPLEMENTED");
};

export const FilesActions = {
    load,
    remove,
    removeByRecord,
    rename,
    download,
    preview,
};
