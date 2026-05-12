// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Button, Colors } from "@blueprintjs/core";

import { Icon } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { TaskColorButton } from "app/widgets";
import { TasksActions } from "app/store/actions";

interface TaskDetailsTintProps {
    taskId: string;
    tint?: string;
    vertical?: boolean;
    centered?: boolean;
    disabled?: boolean;
}
export const TaskDetailsTint: FunctionComponent<TaskDetailsTintProps> = ({
    taskId,
    tint,
    vertical,
    centered,
    disabled,
}) => {
    const handleTintChange = (tint: string | undefined) => {
        TasksActions.setTint(taskId, tint);
    };

    return (
        <TaskDetailsSection title={translate("Tint")} centered={centered} vertical={vertical}>
            <TaskColorButton tint={tint} onChange={handleTintChange}>
                <Button
                    minimal
                    small
                    icon={<Icon icon="stop-filled" color={tint ?? Colors.GRAY5} />}
                    disabled={disabled}
                >
                    Tint color
                </Button>
            </TaskColorButton>
        </TaskDetailsSection>
    );
};
