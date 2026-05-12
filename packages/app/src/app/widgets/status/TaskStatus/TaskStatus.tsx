// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { RoundButton } from "app/components/common";
import { TasksActions } from "app/store/actions";
import { TagsPickerPopup } from "app/widgets/common";
import { ProjectStatus } from "app/widgets/project";
import { getTag } from "app/hooks";

interface ITaskStatusProps {
    value: string | null;
    taskId?: string;
    disabled?: boolean;
    canClear?: boolean;
    minimal?: boolean;
    onToggle?: (statusId: string | null) => void;
}
export const TaskStatus: FunctionComponent<ITaskStatusProps> = ({
    value,
    taskId,
    disabled,
    canClear,
    minimal,
    onToggle,
}) => {
    const status: ITag | undefined = value ? getTag(value) : undefined;

    const handleSetStatus = (status?: ITag) => {
        if (taskId) {
            TasksActions.setStatus(taskId, status && status.id !== value ? status.id : undefined);
        } else if (onToggle) {
            onToggle(status && status.id !== value ? status.id : null);
        }
    };

    return (
        <TagsPickerPopup
            value={[status ? status.id : ""]}
            section={TAGSECTION.PROJECTS}
            placement="top"
            shouldDismissPopover={true}
            type={TAGTYPE.STATUS}
            onToggle={handleSetStatus}
            disabled={disabled}
        >
            {status ? (
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
