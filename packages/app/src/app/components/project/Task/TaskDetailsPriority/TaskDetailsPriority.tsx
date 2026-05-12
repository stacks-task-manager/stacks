// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { PRIORITY } from "@stacks/types";
import { RoundButton } from "app/components/common";
import { PriorityMenu, PriorityChip } from "app/components/project";
import { TasksActions } from "app/store/actions";
import { useElementHotkey } from "app/hooks";
import { Popover } from "@blueprintjs/core";

interface ITaskDetailsPriorityProps {
    taskId: string;
    value: PRIORITY | null;
    disabled?: boolean;
    showEmpty?: boolean;
    canClear?: boolean;
    minimal?: boolean;
}
export const TaskDetailsPriority: FunctionComponent<ITaskDetailsPriorityProps> = ({
    taskId,
    value,
    disabled,
    showEmpty,
    canClear,
    minimal,
}) => {
    useElementHotkey("shift+p", "td-priority");

    const handlePriorityChange = (priority: PRIORITY | null) => {
        TasksActions.setPriority(taskId, priority);
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
                        id="td-priority"
                        dashed
                        icon={minimal ? "flag" : undefined}
                        title={minimal ? undefined : translate("Add priority")}
                        disabled={disabled}
                        testId="task-details-priority"
                    />
                )}
                {value && value !== PRIORITY.NONE && (
                    <PriorityChip
                        id="td-priority"
                        priority={value}
                        interactive={!disabled}
                        onRemove={
                            canClear && !disabled ? () => handlePriorityChange(PRIORITY.NONE) : undefined
                        }
                        testId="task-details-priority"
                    />
                )}
            </>
        </Popover>
    );
};
