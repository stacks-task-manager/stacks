// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useState } from "react";

import { Icon } from "app/components/common";
import { ITask } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { stripMd } from "app/utils/string";
import { TaskPicker } from "../TaskPicker/TaskPicker";

interface ITaskPickerPopupProps {
    projectId: string;
    value?: string;
    disabledTasks?: string[];
    onChange: (taskId: string) => void;
}
export const TaskPickerPopup: FunctionComponent<ITaskPickerPopupProps> = ({
    projectId,
    value,
    disabledTasks,
    onChange,
}) => {
    const [task, setTask] = useState<ITask | undefined>();

    const loadTask = async () => {
        if (!value) {
            setTask(undefined);
            return;
        }
        const loadedTask = await TasksActions.getTask(value);
        setTask(loadedTask);
    };

    useEffect(() => {
        loadTask();
    }, [value]);

    return (
        <Popover
            content={
                <TaskPicker
                    projectId={projectId}
                    value={value}
                    disabledTasks={disabledTasks}
                    onChange={onChange}
                    shouldDismissPopover
                />
            }
            matchTargetWidth
            fill
            minimal
            captureDismiss
            placement="bottom"
            disabled={projectId == null}
        >
            <Button
                fill
                rightIcon={<Icon icon="chevron-selector-vertical" />}
                alignText={Alignment.LEFT}
                disabled={projectId == null}
            >
                {task ? stripMd(task.title).substring(0, 29) : " "}
                {task && stripMd(task.title).length > 29 ? "..." : ""}
            </Button>
        </Popover>
    );
};
