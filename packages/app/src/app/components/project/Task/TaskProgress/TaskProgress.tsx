// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Intent, Tag } from "@blueprintjs/core";

import { RoundButton } from "app/components/common";
import { ProgressPicker } from "app/components/project";
import { TasksActions } from "app/store/actions";


interface ITaskProgressProps {
    taskId: string;
    progress?: number;
    disabled?: boolean;
}
export const TaskProgress: FunctionComponent<ITaskProgressProps> = ({ taskId, progress, disabled }) => {
    const handleSetProgress = (value: number) => {
        TasksActions.setProgress(taskId, value);
    };

    return (
        <ProgressPicker value={progress || 0} disabled={disabled} onChange={handleSetProgress}>
            <>
                {(progress == null || progress === 0) && (
                    <RoundButton
                        dashed
                        icon="percent-02"
                        title={!progress ? undefined : `${progress}%`}
                        tooltip="Set percentage"
                    />
                )}
                {Boolean(progress) && progress! > 0 && <Tag minimal round intent={Intent.SUCCESS} interactive>{progress}%</Tag>}
            </>
        </ProgressPicker>

    )
}