// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Intent, ProgressBar } from "@blueprintjs/core";
import classNames from "classnames";

import { ProgressPicker } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { useElementHotkey } from "app/hooks";

interface ITaskDetailsProgressProps {
    taskId: string;
    progress?: number;
    disabled?: boolean;
    maxWidth?: number;
    onComplete: () => void;
}
export const TaskDetailsProgress: FunctionComponent<ITaskDetailsProgressProps> = ({
    taskId,
    progress,
    disabled,
    maxWidth,
    onComplete,
}) => {
    useElementHotkey("shift+o", "td-progress");

    const handleSetProgress = (value: number) => {
        TasksActions.setProgress(taskId, value);
        if (value === 100) onComplete();
    };

    return (
        <div
            className={classNames("task-details-progress", { disabled })}
            style={{ maxWidth: maxWidth || 200 }}
        >
            <ProgressPicker value={progress || 0} disabled={disabled} onChange={handleSetProgress}>
                <span id="td-progress">
                    <ProgressBar
                        stripes={false}
                        value={progress ? progress / 100 : 0}
                        intent={Intent.SUCCESS}
                    />
                </span>
            </ProgressPicker>
        </div>
    );
};
