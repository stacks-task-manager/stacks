// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Hydrate attachments for tasks/records.
 */
import { produce } from "immer";

import { AttachmentsStore, IAttachmentsStore } from "../attachments";
import { FilesActions } from "./files";
import { FILES_TYPE, IAttachment } from "@stacks/types";

const load = async (taskId: string) => {
    AttachmentsStore.set(
        produce((state: IAttachmentsStore) => {
            state.attachments[taskId] = [];
        })
    );

    const files = await FilesActions.load(taskId, FILES_TYPE.TASK_ATTACHMENT);

    AttachmentsStore.set(
        produce((state: IAttachmentsStore) => {
            state.attachments[taskId] = files;
        })
    );
};

const setAttachments = (attachments: { [taskId: string]: IAttachment[] }) => {
    AttachmentsStore.set(
        produce((state: IAttachmentsStore) => {
            for (const taskId of Object.keys(attachments)) {
                state.attachments[taskId] = attachments[taskId];
            }
        })
    );
};

const appendAttachments = (taskId: string, attachments: IAttachment[]) => {
    AttachmentsStore.set(
        produce((state: IAttachmentsStore) => {
            // state.attachments[taskId] = [...attachments, ...(state.attachments[taskId] ?? [])];

            const existingAttachments = state.attachments[taskId] ?? [];
            const newUniqueAttachments = attachments.filter(
                newAttachment =>
                    !existingAttachments.some(existing => existing.downloadUrl === newAttachment.downloadUrl)
            );

            state.attachments[taskId] = [...existingAttachments, ...newUniqueAttachments];
        })
    );
};

const deleteAttachment = (taskId: string, attachmentId: string) => {
    AttachmentsStore.set(
        produce((state: IAttachmentsStore) => {
            if (state.attachments[taskId].length) {
                state.attachments[taskId] = state.attachments[taskId].filter(
                    attachment => attachment.id !== attachmentId
                );
            }
        })
    );
};

export const AttachmentsActions = {
    load,
    setAttachments,
    appendAttachments,
    deleteAttachment,
};
