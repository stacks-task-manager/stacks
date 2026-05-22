// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Intent } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { RoundButton } from "app/components/common";
import { TasksActions } from "app/store/actions";

interface TaskDeleteButtonProps {
    taskId: string;
    disabled?: boolean;
    dashed?: boolean;
}
export const TaskDeleteButton: FunctionComponent<TaskDeleteButtonProps> = ({ taskId, disabled, dashed }) => {
    const handleDelete = () => {
        TasksActions.alertDelete(taskId);
    };

    return (
        <RoundButton
            dashed={dashed ?? true}
            icon="trash"
            tooltip={translate("Delete task", { suffix: "" })}
            disabled={disabled}
            intent={Intent.DANGER}
            active
            onClick={handleDelete}
        />
    );
};
