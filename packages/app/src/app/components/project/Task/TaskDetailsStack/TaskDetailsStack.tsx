// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { TaskStackPicker, TaskDetailsSection } from "app/components/project";
import { useElementHotkey } from "app/hooks";

interface ITaskDetailsStackProps {
    taskId: string;
    projectId: string;
    stackId: string;
    vertical?: boolean;
    centered?: boolean;
    disabled?: boolean;
    width?: number;
}
const TaskDetailsStackRaw: FunctionComponent<ITaskDetailsStackProps> = ({
    taskId,
    projectId,
    stackId,
    vertical,
    centered,
    disabled,
    width,
}) => {
    useElementHotkey("shift+b", "td-stacks");

    return (
        <TaskDetailsSection title={translate("Stack")} centered={centered} vertical={vertical} width={width}>
            <TaskStackPicker
                taskId={taskId}
                stackId={stackId}
                projectId={projectId}
                disabled={disabled || projectId === "inbox"}
                id="td-stacks"
            />
        </TaskDetailsSection>
    );
};

export const TaskDetailsStack = React.memo(TaskDetailsStackRaw);
