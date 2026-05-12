// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";
import { useStack } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { StacksMenu } from "app/widgets";

interface ITaskStackPickerProps {
    taskId: string;
    stackId: string;
    projectId: string;
    disabled?: boolean;
    id?: string;
}
export const TaskStackPicker: FunctionComponent<ITaskStackPickerProps> = ({
    taskId,
    stackId,
    projectId,
    disabled,
    id,
}) => {
    const stack = useStack(stackId);

    const handleMoveTask = async (stackId: string) => {
        TasksActions.moveToStack(taskId, stackId, 0);
    };

    return (
        <Popover
            content={
                <StacksMenu
                    projectId={projectId}
                    showAdd
                    selected={stackId}
                    onClick={handleMoveTask}
                />
            }
            disabled={disabled}
            lazy
        >
            <Button
                variant="minimal"
                size="small"
                icon={<Icon icon="stop-filled" color={stack?.tint} />}
                id={id}
            >
                {stack?.title}
            </Button>
        </Popover>
    );
};
