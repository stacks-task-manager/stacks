// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { DatePickerButton } from "app/components/common";
import { useElementHotkey } from "app/hooks";
import { TasksActions } from "app/store/actions";

interface TaskDetailsStartDateProps {
    value: Date | null;
    disabled?: boolean;
    maxDate?: Date;
    taskId: string;
}
export const TaskDetailsStartDate: FunctionComponent<TaskDetailsStartDateProps> = ({
    value,
    disabled,
    maxDate,
    taskId,
}) => {
    useElementHotkey("shift+g", "td-start-date");

    return (
        <DatePickerButton
            id="td-start-date"
            value={value ?? null}
            disabled={disabled}
            maxDate={maxDate}
            extendedFormat
            hideTooltip
            onChange={(date: Date | null) => TasksActions.setStartDate(taskId, date)}
            testId="task-details-start-date"
        />
    )
};
