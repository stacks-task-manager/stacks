// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Spinner } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { APPICONS } from "@stacks/types";
import { BlankSlate, Col, Grid, RoundButton, Row } from "app/components/common";
import { useDependants, useDependantsCount, useTask } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { TaskDependenciesDialog, TaskItems } from "app/widgets";

interface TaskDetailsDependenciesProps {
    taskId: string;
    disabled?: boolean;
}

export const DependenciesCount = ({ taskId }: { taskId: string }) => {
    const dependenciesCount = useDependantsCount(taskId, false);
    if (!dependenciesCount) return null;
    return <>{dependenciesCount}</>;
};

export const TaskDetailsDependencies: FunctionComponent<TaskDetailsDependenciesProps> = ({
    taskId,
    disabled,
}) => {
    const { tasks, isLoading } = useDependants(taskId);
    const [isOpen, setIsOpen] = useState(false);
    const { task } = useTask(taskId);

    const handleAddDependencies = async (selectedTasks: string[]) => {
        await TasksActions.setDependencies(taskId, selectedTasks);
    };

    return (
        <>
            {isOpen && (
                <TaskDependenciesDialog
                    parentId={taskId}
                    onClose={() => setIsOpen(false)}
                    onSelect={handleAddDependencies}
                    values={task?.dependencies}
                />
            )}
            {tasks.length === 0 ? (
                <Row>
                    <Col justify="center">
                        <BlankSlate
                            icon={APPICONS.TASK}
                            title={translate("No dependencies")}
                            description={translate("This task does not have any dependencies yet Click the button below to add the first one")}
                            small
                            maxWidth={250}
                        >
                            {!disabled && (<RoundButton
                                id="td-dependencies"
                                minimal
                                title={translate("Add dependencies")}
                                icon="plus"
                                disabled={disabled}
                                onClick={() => setIsOpen(true)}
                            />)}
                        </BlankSlate>
                    </Col>
                </Row>
            ) : (
                <Grid padding={[0, 20]}>
                    {isLoading ? <Spinner /> :
                        <>
                            <TaskItems parentId={taskId} tasks={tasks} showProject={true} />

                            {!disabled && (<div>
                                <RoundButton
                                    id="td-dependencies"
                                    minimal
                                    title={translate("Add dependencies")}
                                    icon="plus"
                                    disabled={disabled}
                                    onClick={() => setIsOpen(true)}
                                />
                            </div>)}
                        </>}
                </Grid>
            )}
        </>
    );
};
