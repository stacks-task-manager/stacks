// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import React, { FunctionComponent } from "react";
import { useElementHotkey } from "app/hooks";
import { TaskState } from "app/components/project";

interface TaskDetailsStateProps {
    isComplete?: boolean;
    taskId: string;
    onClose: (delayed: boolean) => void;
}
export const TaskDetailsState: FunctionComponent<TaskDetailsStateProps> = ({
    isComplete,
    taskId,
    onClose: _onClose,
}) => {
    useElementHotkey("shift+c", "td-state");

    return (
        <>
            <TaskState id="td-state" taskId={taskId} />
            &nbsp;
            {taskToggleDoneLabel(Boolean(isComplete))}
        </>
    );
};
