// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { FILES_TYPE } from "@stacks/types";

export function canWriteAttachmentParent(input: {
    type: string;
    admin: boolean;
    userId: string;
    ownerId?: string | null;
    projectOwnerId?: string | null;
    canWriteComments: boolean;
    canWriteCompanies: boolean;
    canWriteProjectSettings: boolean;
}): boolean {
    if (input.admin) return true;
    if (input.type === FILES_TYPE.TASK_COMMENT) return input.canWriteComments;
    if (input.type === FILES_TYPE.COMPANY_LOGO) return input.canWriteCompanies;
    if (input.type === FILES_TYPE.PROJECT_DESCRIPTION) {
        return input.canWriteProjectSettings || input.projectOwnerId === input.userId;
    }
    if (input.type === FILES_TYPE.AVATAR) return input.ownerId === input.userId;
    return input.ownerId === input.userId;
}
