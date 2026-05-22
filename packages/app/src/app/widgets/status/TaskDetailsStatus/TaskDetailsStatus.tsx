// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { RoundButton } from "app/components/common";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { ProjectStatus, TagsPickerPopup } from "app/widgets";
import { useElementHotkey } from "app/hooks";

interface ITaskDetailsStatusProps {
    taskId: string;
    value: string | null;
    disabled?: boolean;
    canClear?: boolean;
    minimal?: boolean;
}
export const TaskDetailsStatus: FunctionComponent<ITaskDetailsStatusProps> = ({
    taskId,
    value,
    disabled,
    canClear,
    minimal,
}) => {
    useElementHotkey("shift+y", "td-status");

    const handleSetStatus = (status?: ITag) => {
        TasksActions.setStatus(taskId, status ? status.id : undefined);
    };

    return (
        <TagsPickerPopup
            value={value ? [value] : []}
            section={TAGSECTION.PROJECTS}
            placement="top"
            shouldDismissPopover={true}
            type={TAGTYPE.STATUS}
            disabled={disabled}
            onToggle={handleSetStatus}
        >
            {value ? (
                <ProjectStatus
                    status={value}
                    interactive
                    id="td-status"
                    disabled={disabled}
                    onRemove={value && canClear ? () => handleSetStatus() : undefined}
                />
            ) : (
                <RoundButton
                    id="td-status"
                    dashed
                    title={minimal ? undefined : translate("Add status")}
                    icon={minimal ? "activity" : undefined}
                    disabled={disabled}
                />
            )}
        </TagsPickerPopup>
    );
};
