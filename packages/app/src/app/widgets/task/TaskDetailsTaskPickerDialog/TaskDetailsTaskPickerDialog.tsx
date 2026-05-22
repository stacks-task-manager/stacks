// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { TaskPickerDialog } from "app/widgets/task";
import React, { FunctionComponent } from "react";

interface ITaskDetailsTaskPickerDialogProps {
    taskId: string;
    projectId: string;
    onChange: (taskId: string) => void;
    onClose: () => void;
}
export const TaskDetailsTaskPickerDialog: FunctionComponent<ITaskDetailsTaskPickerDialogProps> = ({
    taskId,
    projectId,
    onChange,
    onClose,
}) => {
    return (
        <TaskPickerDialog
            projectId={projectId}
            disabledTasks={[taskId]}
            onChange={onChange}
            onClose={onClose}
        />
    );
};
