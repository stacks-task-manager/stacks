// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Attachments hooks and selectors.
 */
import { AttachmentsStore } from "app/store/attachments";
import { shallowEqual } from "./store";
import { useProjectTasksIds } from "./tasks";
import flatten from "lodash/flatten";

/**
 * Returns the attachments for the given task.
 * @param taskId The id of the task
 * @returns Array of attachments for the task
 */
export const useTaskAttachments = (taskId: string) => {
    return AttachmentsStore.use(state => state.attachments[taskId] ?? [], shallowEqual);
};

/**
 * Returns the attachments for all tasks in the given project.
 * @param projectId The id of the project
 * @returns Flattened array of attachments for the project's tasks
 */
export const useProjectAttachments = (projectId: string) => {
    const taskIds = useProjectTasksIds(projectId);
    const attachments = AttachmentsStore.use(
        state => taskIds.map(taskId => state.attachments[taskId]).filter(list => list != null),
        shallowEqual
    );

    return flatten(attachments);
};
