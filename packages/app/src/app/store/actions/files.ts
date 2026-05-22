// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * File upload and attachment store sync.
 */
import { FilesAPI } from "app/api";
import { FILES_TYPE, IAttachment } from "@stacks/types";

const load = async (resourceId: string, type: FILES_TYPE): Promise<IAttachment[]> => {
    return await FilesAPI.load(resourceId, type);
};

const remove = async (attachmentId: string) => {
    return await FilesAPI.deleteByAttachment(attachmentId);
};

const download = (attachmentId: string) => {
    window.open("/api/files/download/" + attachmentId, "_blank");
};

const preview = (attachmentId: string) => {
    window.open("/api/files/preview/" + attachmentId + "?size=preview", "_blank");
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
