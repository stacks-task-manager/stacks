// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Icon } from "app/components/common";
import { useProjectShowSubtasks, useSubtasks } from "app/hooks";
import React, { FunctionComponent } from "react";

interface SubtasksCountButtonProps {
    taskId: string;
    isVisible?: boolean;
    onClick?: () => void;
}
export const SubtasksCountButton: FunctionComponent<SubtasksCountButtonProps> = ({
    taskId,
    isVisible,
    onClick,
}) => {
    const showSubtasks = useProjectShowSubtasks();
    const { subtasks } = useSubtasks(taskId, false);
    if (!subtasks.length || showSubtasks) return null;

    return (
        <span onClick={event => event.stopPropagation()}>
            <button className="task-card-button" onClick={onClick} data-testid="subtasks-count-button">
                <span data-testid="subtasks-count">{subtasks.length}</span>
                <Icon icon="git-branch-01" size={12} />

                {isVisible != null ? (
                    <Icon icon={isVisible ? "chevron-down" : "chevron-right"} size={10} className="chevron" />
                ) : null}
            </button>
        </span>
    );
};
