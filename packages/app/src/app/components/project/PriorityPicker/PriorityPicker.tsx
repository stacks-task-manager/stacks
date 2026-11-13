// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { PRIORITY } from "@stacks/types";
import { RoundButton } from "app/components/common";
import { PriorityMenu, PriorityChip } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { useElementHotkey } from "app/hooks";
import { Popover } from "@blueprintjs/core";

interface IPriorityPickerProps {
    value?: PRIORITY | null;
    taskId?: string;
    disabled?: boolean;
    showEmpty?: boolean;
    canClear?: boolean;
    minimal?: boolean;
    short?: boolean;
    tooltip?: string | React.JSX.Element;
    id?: string;
    testId?: string;
    hotkey?: string;
    onChange?: (priority: PRIORITY | null) => void;
}

const PriorityPickerHotkey = ({ hotkey, id }: { hotkey: string; id: string }) => {
    useElementHotkey(hotkey, id);
    return null;
};

export const PriorityPicker = React.memo(function PriorityPicker({
    value,
    taskId,
    disabled,
    showEmpty,
    canClear,
    minimal,
    short,
    tooltip,
    id,
    testId,
    hotkey,
    onChange,
}: IPriorityPickerProps) {
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
                {hotkey && id ? <PriorityPickerHotkey hotkey={hotkey} id={id} /> : null}
                {(!value || value === PRIORITY.NONE) && (
                    <RoundButton
                        id={id}
                        dashed
                        icon={minimal ? "flag" : undefined}
                        title={minimal ? undefined : translate("Add priority")}
                        tooltip={tooltip || translate("Add priority")}
                        disabled={disabled}
                        testId={testId || "priority-button"}
                    />
                )}
                {value && value !== PRIORITY.NONE && (
                    <PriorityChip
                        id={id}
                        priority={value}
                        interactive={!disabled}
                        short={short}
                        onRemove={
                            canClear && !disabled ? () => handlePriorityChange(PRIORITY.NONE) : undefined
                        }
                        testId={testId || "priority-button"}
                    />
                )}
            </>
        </Popover>
    );
});
