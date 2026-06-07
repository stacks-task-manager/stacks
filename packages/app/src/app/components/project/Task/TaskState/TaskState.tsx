// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import React, { FunctionComponent } from "react";
import { Intent, Popover, Spinner } from "@blueprintjs/core";
import { RoundButton } from "app/components/common";
import { TasksActions } from "app/store/actions";
import { useDependants, useSubtasks, useTask } from "app/hooks";
import { TaskItems } from "app/widgets";
import { translate } from "@stacks/translations";

interface ITaskStateProps {
    taskId: string;
    id?: string;
    large?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    testId?: string;
}
export const TaskState: FunctionComponent<ITaskStateProps> = ({ taskId, id, large, disabled, readonly, testId }) => {
    const { isLoading: isTaskLoading, task } = useTask(taskId);
    const { subtasks, isLoading: isSubtasksLoading } = useSubtasks(taskId, false);
    const { tasks, isLoading: isDependantsLoading } = useDependants(taskId, false);

    const handleToggleState = async () => {
        await TasksActions.toggleDone(taskId);
    };

    if (isTaskLoading || isSubtasksLoading || isDependantsLoading) {
        return <Spinner size={18} />;
    }

    // 1. if task is archived show a - red icon
    if (task?.archived) {
        return (
            <RoundButton
                icon="minus"
                id={id}
                small={!large}
                tooltip={translate("Task is archived")}
                intent={Intent.DANGER}
                disabled
                testId={testId}
            />
        )
    }

    // 2. if has dependent tasks that are not done show a - red icon
    if (tasks.length > 0) {
        return (
            <Popover lazy content={
                <>
                    <div style={{ padding: "10px 10px 0 10px" }}>
                        <strong>{translate("Task can't be completed")}</strong>
                        <p>{translate("Waiting on these tasks to be completed")}</p>
                    </div>

                    <TaskItems parentId={taskId} tasks={tasks} minWidth={300} />
                </>
            }>
                <RoundButton
                    icon="minus"
                    id={id}
                    small={!large}
                    tooltip={translate("dependent tasks that are not done", { count: tasks.length })}
                    intent={Intent.DANGER}
                    disabled={disabled}
                    testId={testId}
                />
            </Popover>
        )
    }

    // 3. if has incomplete subtasks show the number of the incomplete subtasks
    if (subtasks.length > 0) {
        return (
            <RoundButton
                id={id}
                small={!large}
                tooltip={translate("incomplete subtasks", { count: subtasks.length })}
                intent={Intent.PRIMARY}
                count={subtasks.length}
                disabled={disabled}
                active
                testId={testId}
            />
        )
    }

    // 4. if all subtasks are done or no subtasks show a checkmark
    const intent = task?.done ? Intent.SUCCESS : undefined;
    const tooltip = readonly ? undefined : taskToggleDoneLabel(Boolean(task?.done))

    return (
        <RoundButton
            icon="check"
            id={id}
            small={!large}
            tooltip={tooltip}
            intent={intent}
            active={task?.done}
            disabled={disabled}
            onClick={readonly ? undefined : handleToggleState}
            testId={testId}
        />
    );
};
