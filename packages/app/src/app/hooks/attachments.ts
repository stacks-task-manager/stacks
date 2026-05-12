// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Attachments hooks and selectors.
 */
import { AttachmentsStore } from "app/store/attachments";
import { shallowEqual } from "./store";
import { useProjectTasksIds } from "./tasks";
import flatten from "lodash/flatten";

export const useTaskAttachments = (taskId: string) => {
    return AttachmentsStore.use(state => state.attachments[taskId] ?? [], shallowEqual);
};

export const useProjectAttachments = (projectId: string) => {
    const taskIds = useProjectTasksIds(projectId);
    const attachments = AttachmentsStore.use(
        state => taskIds.map(taskId => state.attachments[taskId]).filter(list => list != null),
        shallowEqual
    );

    return flatten(attachments);
};
