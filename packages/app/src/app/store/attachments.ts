// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Attachment list state for the active record.
 */
import { entity } from "app/hooks/store";
import { IAttachment } from "@stacks/types";

export interface IAttachmentsStore {
    attachments: {
        [taskId: string]: IAttachment[];
    };
}

export const AttachmentsStore = entity<IAttachmentsStore>({
    attachments: {},
});
