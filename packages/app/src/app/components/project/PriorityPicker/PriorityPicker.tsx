// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { PRIORITY } from "@stacks/types";
import { RoundButton } from "app/components/common";
import { PriorityMenu, PriorityChip } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { Popover } from "@blueprintjs/core";

interface IPriorityPickerProps {
    value?: PRIORITY | null;
    taskId?: string;
    disabled?: boolean;
    showEmpty?: boolean;
    canClear?: boolean;
    minimal?: boolean;
    short?: boolean;
    tooltip?: string | JSX.Element;
    onChange?: (priority: PRIORITY | null) => void;
}
export const PriorityPicker: FunctionComponent<IPriorityPickerProps> = ({
    value,
    taskId,
    disabled,
    showEmpty,
    canClear,
    minimal,
    short,
    tooltip,
    onChange,
}) => {
    const handlePriorityChange = (priority: PRIORITY | null) => {
        if (taskId) {
            TasksActions.setPriority(taskId, priority);
        } else if (onChange) {
            onChange(priority);
        }
    };

    if (!showEmpty && (!value || value === PRIORITY.NONE)) return null;

    return (
        <Popover
            content={<PriorityMenu value={value || PRIORITY.NONE} onChange={handlePriorityChange} />}
            placement="top"
            disabled={disabled}
        >
            <>
                {(!value || value === PRIORITY.NONE) && (
                    <RoundButton
                        dashed
                        icon={minimal ? "flag" : undefined}
                        title={minimal ? undefined : translate("Add priority")}
                        tooltip={tooltip || translate("Add priority")}
                        disabled={disabled}
                        testId="priority-button"
                    />
                )}
                {value && value !== PRIORITY.NONE && (
                    <PriorityChip
                        priority={value}
                        interactive={!disabled}
                        short={short}
                        onRemove={
                            canClear && !disabled ? () => handlePriorityChange(PRIORITY.NONE) : undefined
                        }
                    />
                )}
            </>
        </Popover>
    );
};
