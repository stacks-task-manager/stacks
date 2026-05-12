// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import { Classes, Intent, Popover, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useState } from "react";
import { Icon } from "app/components/common";
import { TaskContextMenu } from "app/components/project";
import { ITask } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { NewTaskPopup } from "../NewTaskPopup/NewTaskPopup";

interface TaskContextButtonProps {
    task: ITask;
    stackId?: string;
}
export const TaskContextButton: FunctionComponent<TaskContextButtonProps> = ({ task, stackId }) => {
    const [open, setOpen] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const handleDelete = () => {
        TasksActions.alertDelete(task.id);
    };

    const handleArchive = () => {
        TasksActions.archiveAlert(task.id);
    };

    const handleComplete = () => {
        TasksActions.toggleDone(task.id);
    };

    const handleToggleNewSubtask = () => {
        setShowNew(!showNew);
    };

    return (
        <span
            className={classNames("task-context-wrapper", { open })}
            onClick={event => event.stopPropagation()}
            data-testid="task-context-button"
        >
            <div className="quick-button-wrapper">
                <Button
                    tooltip={translate("Delete task", { suffix: "" })}
                    icon="trash"
                    intent={Intent.DANGER}
                    onClick={handleDelete}
                    testId="task-context-button-delete"
                />
                <Button
                    tooltip={translate("Archive task")}
                    icon="archive"
                    intent={Intent.WARNING}
                    onClick={handleArchive}
                    testId="task-context-button-archive"
                />
                <Button
                    tooltip={translate("Add subtask")}
                    icon="git-branch-01"
                    intent={Intent.PRIMARY}
                    onClick={handleToggleNewSubtask}
                    testId="task-context-button-add-subtask"
                />
                <Button
                    tooltip={taskToggleDoneLabel(task.done)}
                    icon="check"
                    intent={Intent.SUCCESS}
                    onClick={handleComplete}
                    testId="task-context-button-complete"
                />
            </div>

            <Popover
                content={<TaskContextMenu task={task} />}
                placement="bottom-end"
                onClosed={() => setOpen(false)}
                onOpening={() => setOpen(true)}
                renderTarget={({ isOpen, ref, ...popoverProps }) => (
                    <button
                        onClick={(event: React.MouseEvent) => event.stopPropagation()}
                        ref={ref}
                        {...popoverProps}
                        className={classNames("task-context-button", { [Classes.ACTIVE]: isOpen })}
                    >
                        <Icon icon="dots-vertical" />
                    </button>
                )}
            />

            {showNew && (
                <NewTaskPopup defaultStack={stackId} parent={task.id} onClose={handleToggleNewSubtask} />
            )}
        </span>
    );
};

interface ButtonProps {
    tooltip: React.JSX.Element | string;
    intent: Intent;
    icon: string;
    onClick?: () => void;
    testId?: string;
}
const Button: FunctionComponent<ButtonProps> = ({ tooltip, intent, icon, onClick, testId }) => {
    return (
        <Tooltip content={tooltip} placement="top">
            <button className={`small text-${intent}`} onClick={onClick} data-testid={testId}>
                <Icon icon={icon} />
            </button>
        </Tooltip>
    );
};
