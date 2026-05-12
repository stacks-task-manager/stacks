// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { RoundButton } from "app/components/common";
import { TintPicker } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { Popover } from "@blueprintjs/core";

interface TaskColorButtonProps {
    tint?: string;
    taskId?: string;
    disabled?: boolean;
    children?: React.ReactNode;
    onChange?: (color: string | undefined) => void;
}
export const TaskColorButton: FunctionComponent<TaskColorButtonProps> = ({
    tint,
    taskId,
    disabled,
    children,
    onChange,
}) => {
    const handleToggleColor = (color: string | undefined) => {
        if (taskId) {
            TasksActions.setTint(taskId, color);
        } else if (onChange) {
            onChange(color);
        }
    };

    return (
        <Popover
            content={<TintPicker value={tint} canClear onChange={handleToggleColor} />}
            popoverClassName="popover-padded-small"
            placement="bottom"
            disabled={disabled}
        >
            {children != null ? (
                children
            ) : (
                <RoundButton
                    dashed
                    icon="palette"
                    tooltip={translate("Set tint color")}
                    disabled={disabled}
                />
            )}
        </Popover>
    );
};
