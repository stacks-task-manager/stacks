// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { DatePickerButton } from "app/components/common";
import { useElementHotkey } from "app/hooks";
import { TasksActions } from "app/store/actions";

interface TaskDateFieldBaseProps {
    taskId: string;
    value: Date | null;
    disabled?: boolean;
}

interface TaskStartDateFieldProps extends TaskDateFieldBaseProps {
    kind: "start";
    maxDate?: Date;
}

interface TaskDueDateFieldProps extends TaskDateFieldBaseProps {
    kind: "due";
    minDate?: Date;
}

type TaskDateFieldProps = TaskStartDateFieldProps | TaskDueDateFieldProps;

export const TaskDateField: FunctionComponent<TaskDateFieldProps> = props => {
    const isStart = props.kind === "start";
    const elementId = isStart ? "td-start-date" : "td-due-date";
    useElementHotkey(isStart ? "shift+g" : "shift+d", elementId);

    return (
        <DatePickerButton
            id={elementId}
            value={props.value}
            disabled={props.disabled}
            maxDate={isStart ? props.maxDate : undefined}
            minDate={!isStart ? props.minDate : undefined}
            extendedFormat
            hideTooltip
            onChange={(date: Date | null) =>
                isStart
                    ? TasksActions.setStartDate(props.taskId, date)
                    : TasksActions.setDueDate(props.taskId, date)
            }
            testId={isStart ? "task-details-start-date" : "task-details-due-date"}
        />
    );
};
