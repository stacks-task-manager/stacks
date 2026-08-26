// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Shared single-task action-menu handlers (toggle-complete, archive, unarchive,
 * delete, copy-move, export). Used by TaskDetailsMenu. The multi-select-aware
 * TaskContextMenu keeps its own handlers because it operates on a tasks array.
 */
import { COPYMOVETYPE, ITask } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { CopyMoveActions } from "app/store/actions/copymove";
import { stripMd } from "app/utils/string";

interface IUseTaskMenuActionsOptions {
    onClose?: (delayed?: boolean) => void;
}

/**
 * Single-task action-menu handlers: toggle-complete, archive, unarchive, delete,
 * copy-move, and export. Used by TaskDetailsMenu.
 * @param task The task the actions operate on.
 * @param options Optional hook options.
 * @param options.onClose Optional callback invoked after an action completes, with
 *   `delayed` true when the menu should close after a delay.
 * @returns {object} An object of handler functions: `handleToggleComplete`,
 *   `handleArchive`, `handleUnarchive`, `handleDeleteTask`, `handleCopyMove`,
 *   and `handleExport`.
 */
export const useTaskMenuActions = (task: ITask, options?: IUseTaskMenuActionsOptions) => {
    const onClose = options?.onClose;

    /**
     * Toggles the task's done state and closes the menu if the task was incomplete.
     */
    const handleToggleComplete = () => {
        TasksActions.toggleDone(task.id);
        if (!task.done) onClose?.(true);
    };

    /**
     * Archives the task (with confirmation) and closes the menu.
     */
    const handleArchive = async () => {
        await TasksActions.archiveAlert(task.id);
        onClose?.(true);
    };

    /**
     * Unarchives the task, optionally into a given stack, and closes the menu.
     * @param stackId Optional stack to place the task in.
     */
    const handleUnarchive = async (stackId?: string) => {
        await TasksActions.unarchive(task.id, stackId);
        onClose?.(true);
    };

    /**
     * Deletes the task after confirmation; closes the menu when the delete succeeds.
     */
    const handleDeleteTask = async () => {
        const response = await TasksActions.alertDelete(task.id);
        if (response) onClose?.();
    };

    /**
     * Opens the copy/move dialog for the task and closes the menu.
     */
    const handleCopyMove = () => {
        CopyMoveActions.show({
            title: stripMd(task.title),
            type: COPYMOVETYPE.TASK,
            tasks: [task.id],
        });
        onClose?.();
    };

    /**
     * Exports the task in the given format.
     * @param type The export format type.
     */
    const handleExport = (type: "pdf" | "json" | "excel" | "xlsx") => {
        TasksActions.exportTask(task.id, type === "xlsx" ? "excel" : type);
    };

    return {
        handleToggleComplete,
        handleArchive,
        handleUnarchive,
        handleDeleteTask,
        handleCopyMove,
        handleExport,
    };
};
