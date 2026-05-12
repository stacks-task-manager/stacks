// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import { ITask } from "@stacks/types";
import { TaskState } from "app/components/project";
import classNames from "classnames";
import React from "react";
import { FunctionComponent } from "react";
import { TaskDate } from "../TaskDate/TaskDate";
import { TaskAssignees } from "../TaskAssignees/TaskAssignees";
import { useNav } from "app/hooks";
import { getTaskModalListBackgroundFromHistory, snapshotTaskModalBackground } from "app/hooks/router";
import { PreferencesStore } from "app/store/preferences";
import { Grid, Scroller } from "app/components/common";


interface TaskItemsProps {
    parentId?: string;
    tasks: ITask[];
    disabled?: boolean;
    max?: number;
    minWidth?: number;
    maxHeight?: number;
    showProject?: boolean;
}

export const TaskItems: FunctionComponent<TaskItemsProps> = ({ parentId, tasks, disabled, max, minWidth, maxHeight, showProject }) => {
    const navigate = useNav();

    const handleOpenParent = () => {
        const firstSubtask = tasks.at(0);
        if (!firstSubtask) return;

        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${firstSubtask.project}/${parentId}`);
        } else {
            navigate(`/task/${parentId}`);
        }

        setTimeout(() => {
            document.getElementById("subtasks")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
    };

    return (
        <Scroller className="task-items" minWidth={minWidth} vertical maxHeight={maxHeight}>
            {tasks.slice(0, max || Infinity).map(task => <TaskItem key={task.id} task={task} disabled={disabled} showProject={showProject} />)}
            {max && tasks.length > max && (
                <div className="task-items-checklist-link">
                    <a className={Classes.POPOVER_DISMISS} onClick={handleOpenParent}>
                        View all tasks
                    </a>
                </div>
            )}
        </Scroller>
    );
}

interface TaskItemProps {
    task: ITask;
    disabled?: boolean;
    children?: React.ReactNode;
    showProject?: boolean;
}
export const TaskItem = ({ task, disabled, children, showProject }: TaskItemProps) => {
    const navigate = useNav();

    const handleOpenSubtask = (subtask: ITask) => {
        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${subtask.project}/${subtask.id}`);
        } else {
            const backgroundLocation =
                getTaskModalListBackgroundFromHistory() ?? snapshotTaskModalBackground();
            navigate(`/task/${subtask.id}`, {
                state: {
                    backgroundLocation,
                },
            });
        }
    };

    return (
        <div className="task-items-checklist-item" key={task.id}>
            <TaskState taskId={task.id} disabled={disabled} />
            <div
                className={classNames(
                    "task-items-checklist-item-content",
                    {
                        complete: task.done,
                    },
                    Classes.POPOVER_DISMISS
                )}
                onClick={() => handleOpenSubtask(task)}
            >
                <Grid className="task-items-title" gap={0}>
                    <div>{task.title}</div>
                    {showProject === true && <small className={Classes.TEXT_MUTED}>{task.projectInfo?.title || "No project"}</small>}
                </Grid>

                <span onClick={event => event.stopPropagation()}>
                    <TaskDate
                        taskId={task.id}
                        duedate={task.duedate}
                        startdate={task.startdate}
                        done={task.done}
                        disabled={disabled}
                        className={classNames({
                            hiddable: task.startdate == null && task.duedate == null,
                        })}
                    />
                </span>

                <span onClick={event => event.stopPropagation()}>
                    <TaskAssignees
                        taskId={task.id}
                        assignees={task.assignees || []}
                        minimal
                        showEmpty
                        max={1}
                        className={classNames({ hiddable: !task.assignees?.length })}
                        disabled={disabled}
                    />
                </span>

                {children}
            </div>
        </div>
    )
}