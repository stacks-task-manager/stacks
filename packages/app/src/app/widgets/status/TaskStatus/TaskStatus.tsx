// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { RoundButton } from "app/components/common";
import { TasksActions } from "app/store/actions";
import { TagsPickerPopup } from "app/widgets/common";
import { ProjectStatus } from "app/widgets/project";
import { getTag, useElementHotkey } from "app/hooks";

interface ITaskStatusProps {
    value: string | null;
    taskId?: string;
    disabled?: boolean;
    canClear?: boolean;
    minimal?: boolean;
    variant?: "picker" | "detail";
    testId?: string;
    onToggle?: (statusId: string | null) => void;
}

const TaskStatusHotkey = () => {
    useElementHotkey("shift+y", "td-status");
    return null;
};

export const TaskStatus: FunctionComponent<ITaskStatusProps> = ({
    value,
    taskId,
    disabled,
    canClear,
    minimal,
    variant = "picker",
    testId,
    onToggle,
}) => {
    const status: ITag | undefined = value ? getTag(value) : undefined;
    const isDetail = variant === "detail";

    const handleSetStatus = (status?: ITag) => {
        if (taskId) {
            const nextStatus = isDetail ? status?.id : status && status.id !== value ? status.id : undefined;
            TasksActions.setStatus(taskId, nextStatus);
        } else if (onToggle) {
            onToggle(status && status.id !== value ? status.id : null);
        }
    };

    return (
        <TagsPickerPopup
            value={value ? [value] : []}
            section={TAGSECTION.PROJECTS}
            placement="top"
            type={TAGTYPE.STATUS}
            onToggle={handleSetStatus}
            disabled={disabled}
        >
            {isDetail ? (
                <>
                    <TaskStatusHotkey />
                    {value ? (
                        <span
                            data-testid={testId}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                            <ProjectStatus
                                status={value}
                                interactive
                                id="td-status"
                                testId={testId ? `${testId}-value` : undefined}
                                disabled={disabled}
                            />
                            {canClear && (
                                <RoundButton
                                    testId={testId ? `${testId}-clear` : undefined}
                                    icon="cross"
                                    minimal
                                    small
                                    title={translate("Clear status")}
                                    disabled={disabled}
                                    onClick={event => {
                                        event.stopPropagation();
                                        handleSetStatus();
                                    }}
                                />
                            )}
                        </span>
                    ) : (
                        <RoundButton
                            id="td-status"
                            testId={testId}
                            dashed
                            title={minimal ? undefined : translate("Add status")}
                            icon={minimal ? "activity" : undefined}
                            disabled={disabled}
                        />
                    )}
                </>
            ) : status ? (
                <ProjectStatus
                    status={value}
                    interactive
                    onRemove={value && canClear ? () => handleSetStatus() : undefined}
                />
            ) : (
                <RoundButton
                    dashed
                    title={minimal ? undefined : translate("Add status")}
                    icon={minimal ? "circle" : undefined}
                    tooltip={minimal ? translate("Add status") : undefined}
                    iconSize={10}
                    disabled={disabled}
                />
            )}
        </TagsPickerPopup>
    );
};
