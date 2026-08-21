// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Icon } from "app/components/common";
import { useProjectShowSubtasks, useSubtasks } from "app/hooks";
import React, { FunctionComponent } from "react";

interface ISubtasksCountButtonViewProps {
    count: number;
    isVisible?: boolean;
    onClick?: () => void;
}
const SubtasksCountButtonView: FunctionComponent<ISubtasksCountButtonViewProps> = ({
    count,
    isVisible,
    onClick,
}) => {
    if (!count) return null;

    return (
        <span onClick={event => event.stopPropagation()}>
            <button className="task-card-button" onClick={onClick} data-testid="subtasks-count-button">
                <span data-testid="subtasks-count">{count}</span>
                <Icon icon="git-branch-01" size={12} />

                {isVisible != null ? (
                    <Icon icon={isVisible ? "chevron-down" : "chevron-right"} size={10} className="chevron" />
                ) : null}
            </button>
        </span>
    );
};

interface ISubtasksCountSubProps {
    taskId: string;
    isVisible?: boolean;
    onClick?: () => void;
}
const SubtasksCountSub: FunctionComponent<ISubtasksCountSubProps> = ({ taskId, isVisible, onClick }) => {
    const { subtasks } = useSubtasks(taskId, false);
    return <SubtasksCountButtonView count={subtasks.length} isVisible={isVisible} onClick={onClick} />;
};

interface SubtasksCountButtonProps {
    taskId: string;
    isVisible?: boolean;
    onClick?: () => void;
    /** Pre-resolved subtask count; when provided, the caller already subscribes to subtasks, so the internal store subscription is skipped. */
    count?: number;
}
export const SubtasksCountButton: FunctionComponent<SubtasksCountButtonProps> = ({
    taskId,
    isVisible,
    onClick,
    count,
}) => {
    // The project "show subtasks" setting gates the button regardless of which
    // render path is taken (pre-resolved `count` or internal subscription), so
    // it is read here in the parent rather than only in `SubtasksCountSub`.
    const showSubtasks = useProjectShowSubtasks();
    if (showSubtasks) return null;
    if (count != null) {
        return <SubtasksCountButtonView count={count} isVisible={isVisible} onClick={onClick} />;
    }
    return <SubtasksCountSub taskId={taskId} isVisible={isVisible} onClick={onClick} />;
};
