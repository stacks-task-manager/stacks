// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Intent } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { RoundButton } from "app/components/common";
import { TasksActions } from "app/store/actions";

interface TaskArchiveButtonProps {
    taskId: string;
    disabled?: boolean;
    dashed?: boolean;
}
export const TaskArchiveButton: FunctionComponent<TaskArchiveButtonProps> = ({
    taskId,
    disabled,
    dashed,
}) => {
    const handleArchive = () => {
        TasksActions.archiveAlert(taskId);
    };

    return (
        <RoundButton
            dashed={dashed ?? true}
            icon="archive"
            tooltip={translate("Archive task")}
            disabled={disabled}
            intent={Intent.WARNING}
            active
            onClick={handleArchive}
        />
    );
};
