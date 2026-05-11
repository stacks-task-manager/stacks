// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum FILES_TYPE {
    TASK_ATTACHMENT = "task_attachment",
    TASK_COVER = "task_cover",
    TASK_COMMENT = "task_comment",
    AVATAR = "avatar",
    COMPANY_LOGO = "company_logo",
    NOTEPAD_COVER = "notepad_cover",
    NOTEPAD_FILE = "notepad_file",
    FILE = "file",
    PROJECT_DESCRIPTION = "project_description",
}

export interface IAttachment {
    id: string;
    fileId: string;
    recordId: string;

    thumbnailUrl: string | null;
    downloadUrl: string;
    previewUrl: string;
    hasPreview: boolean;

    originalName: string;
    type: FILES_TYPE;
    size: number;
    humanSize: string;
    mimeType: string;
    extension: string;
    created: string;
    updated: string;
}
