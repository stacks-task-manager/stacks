// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { DatePickerButton } from "app/components/common";
import { useElementHotkey } from "app/hooks";
import { TasksActions } from "app/store/actions";

interface TaskDetailsDueDateProps {
    value: Date | null;
    disabled?: boolean;
    minDate?: Date;
    taskId: string;
}
export const TaskDetailsDueDate: FunctionComponent<TaskDetailsDueDateProps> = ({
    value,
    disabled,
    minDate,
    taskId,
}) => {
    useElementHotkey("shift+d", "td-due-date");

    return (
        <DatePickerButton
            value={value}
            disabled={disabled}
            minDate={minDate}
            id="td-due-date"
            extendedFormat
            hideTooltip
            onChange={(date: Date | null) => TasksActions.setDueDate(taskId, date)}
            testId="task-details-due-date"
        />
    )
};
