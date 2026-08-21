// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Shared shell state for the embedded TaskDetails drawer and the modal
 * TaskDetailsPanel: fullscreen toggle, current-task subscription, and the
 * recent-tasks tracking effect that both shells duplicate.
 */
import { APPICONS } from "@stacks/types";
import { useEffect, useState } from "react";
import { useCurrentTask } from "app/hooks";
import { RecentsActions } from "app/store/actions/recents";

/**
 * Shared shell state for the embedded TaskDetails drawer and the modal
 * TaskDetailsPanel: the fullscreen toggle, the current-task subscription, and
 * recent-tasks tracking.
 * @returns {object} An object with `isLoading`, `task`, `projectId`, `taskId`,
 *   `fullscreen` (boolean), and `handleToggleFullscreen` (toggles fullscreen).
 */
export const useTaskDetailsShell = () => {
    const [fullscreen, setFullscreen] = useState(false);
    const { isLoading, task, projectId, taskId } = useCurrentTask();

    useEffect(() => {
        if (!task) return;
        RecentsActions.add({
            title: task.title,
            icon: APPICONS.TASK,
            url: `/task/${task.id}`,
        });
    }, [task]);

    /**
     * Toggles the fullscreen state.
     */
    const handleToggleFullscreen = () => {
        setFullscreen((value: boolean) => !value);
    };

    return { isLoading, task, projectId, taskId, fullscreen, handleToggleFullscreen };
};
