// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Dialog } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";

import { TaskPicker } from "../TaskPicker/TaskPicker";

interface ITaskPickerDialogProps {
    projectId: string;
    value?: string;
    disabledTasks?: string[];
    onChange: (taskId: string) => void;
    onClose: () => void;
}

export const TaskPickerDialog: FunctionComponent<ITaskPickerDialogProps> = ({
    projectId,
    value,
    disabledTasks,
    onChange,
    onClose,
}) => {
    const [open, setOpen] = useState(true);

    const handleSelectTask = (taskId: string) => {
        onChange(taskId);
        setOpen(false);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleClosed = () => {
        onClose();
    };

    return (
        <Dialog
            isOpen={open}
            title="Select task"
            style={{ width: 300, paddingBottom: 0 }}
            onClose={handleClose}
            onClosed={handleClosed}
        >
            <div style={{ margin: 5 }}>
                <TaskPicker
                    projectId={projectId}
                    value={value}
                    disabledTasks={disabledTasks}
                    onChange={handleSelectTask}
                    onClose={handleClosed}
                />
            </div>
        </Dialog>
    );
};
