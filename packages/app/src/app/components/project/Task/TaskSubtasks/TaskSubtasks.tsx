// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Tag, Tooltip } from "@blueprintjs/core";

import { useSubtasks } from "app/hooks";
import { PopupSubtasksView } from "../../PopupSubtasksView/PopupSubtasksView";
import { Icon, RoundButton } from "app/components/common";

interface ITaskSubtasksProps {
    taskId: string;
    asTag?: boolean;
    asRounded?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}
export const TaskSubtasks: FunctionComponent<ITaskSubtasksProps> = ({
    taskId,
    asTag,
    asRounded,
    disabled,
    onClick,
}) => {
    const { subtasks } = useSubtasks(taskId, false);

    const subtasksButton = useMemo(() => {
        if (asTag)
            return (
                <Tag minimal round interactive onClick={onClick}>
                    <Icon icon="git-branch-01" size={12} /> {subtasks.length}
                </Tag>
            );

        if (asRounded) {
            return <RoundButton dashed icon="git-branch-01" onClick={onClick} />;
        }

        return (
            <button onClick={onClick}>
                <Icon icon="git-branch-01" />
                {subtasks.length ?? 0}
            </button>
        );
    }, [asTag, subtasks, asRounded]);

    if (subtasks.length === 0) return null;

    return (
        <PopupSubtasksView parentId={taskId} disabled={disabled}>
            <Tooltip content={`This task has ${subtasks.length} subtasks`} placement="top">
                {subtasksButton}
            </Tooltip>
        </PopupSubtasksView>
    );
};

interface ITaskParentProps {
    parentId?: string;
    asTag?: boolean;
    asRounded?: boolean;
    onOpen?: () => void;
}
export const TaskParent: FunctionComponent<ITaskParentProps> = ({ parentId, asTag, asRounded, onOpen }) => {
    if (!parentId) return null;

    return (
        <Tooltip content="Open parent task" placement="top">
            {asRounded ? (
                <RoundButton dashed icon="git-merge" />
            ) : asTag ? (
                <Tag minimal round interactive onClick={onOpen}>
                    <Icon icon="git-merge" size={12} /> Open parent
                </Tag>
            ) : (
                <button onClick={onOpen}>
                    <Icon icon="git-merge" />
                </button>
            )}
        </Tooltip>
    );
};
