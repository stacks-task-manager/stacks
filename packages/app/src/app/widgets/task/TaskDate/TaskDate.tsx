// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { DateRangePickerButton } from "app/components/common";
import { TasksActions } from "app/store/actions";

interface ITaskDateProps {
    taskId?: string;
    done?: boolean;
    startdate?: Date | null;
    duedate?: Date | null;
    className?: string;
    disabled?: boolean;
    onChange?: (startDate: Date | null, dueDate: Date | null) => void;
}
export const TaskDate: FunctionComponent<ITaskDateProps> = ({
    taskId,
    done,
    startdate,
    duedate,
    className,
    disabled,
    onChange,
}) => {
    const handleDatesChange = (sDate: Date | null, dDate: Date | null) => {
        if (taskId) {
            TasksActions.setDates(taskId, sDate, dDate);
        } else if (onChange) {
            onChange(sDate, dDate);
        }
    };

    return (
        <DateRangePickerButton
            start={startdate ?? null}
            end={duedate ?? null}
            onChange={handleDatesChange}
            disabled={disabled}
            className={className}
            minimal
            simple
            done={done}
        />
    );
};
