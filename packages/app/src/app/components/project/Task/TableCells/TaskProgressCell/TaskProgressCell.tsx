// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import classNames from "classnames";
import { Colors } from "@blueprintjs/core";

import { ProgressPicker } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { usePreferences } from "app/hooks";

interface ITaskProgressCellProps {
    taskId?: string;
    value: number;
    subtitle?: string | React.ReactNode;
    large?: boolean;
    interactive?: boolean;
    disabled?: boolean;
}
export const TaskProgressCell: FunctionComponent<ITaskProgressCellProps> = ({
    taskId,
    value,
    subtitle,
    large,
    interactive,
    disabled,
}) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    const handleChangeProgress = (progress: number) => {
        if (!taskId) return;
        TasksActions.setProgress(taskId, progress);
    };

    const backgroundColor = useMemo(() => {
        if (value > 90) return Colors.FOREST5;
        if (value > 70) return Colors.BLUE5;
        if (value > 30) return Colors.ORANGE5;
        if (value > 10) return Colors.RED5;
        return Colors.VERMILION5;
    }, [value]);

    return (
        <div className="table-progress-wrapper">
            <ProgressPicker value={value} disabled={!taskId || disabled} onChange={handleChangeProgress}>
                <div
                    className={classNames("table-progress-cell", {
                        large,
                        subtitle: Boolean(subtitle),
                        interactive: interactive && !disabled,
                        animated: showAnimations,
                    })}
                >
                    <div style={{ width: `${value}%`, backgroundColor }} />
                    <span>{value.toFixed()}%</span>
                    {subtitle && <small>{subtitle}</small>}
                </div>
            </ProgressPicker>
        </div>
    );
};
