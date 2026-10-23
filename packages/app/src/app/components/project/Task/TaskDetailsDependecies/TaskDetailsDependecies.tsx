// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Spinner } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { APPICONS } from "@stacks/types";
import { BlankSlate, Col, Grid, RoundButton, Row } from "app/components/common";
import { useDependants, useDependantsCount } from "app/hooks";
import { TaskItems } from "app/widgets";

interface TaskDetailsDependenciesProps {
    taskId: string;
    disabled?: boolean;
    onAddDependencies: () => void;
}

export const DependenciesCount = ({ taskId }: { taskId: string }) => {
    const dependenciesCount = useDependantsCount(taskId, false);
    if (!dependenciesCount) return null;
    return <>{dependenciesCount}</>;
};

export const TaskDetailsDependencies: FunctionComponent<TaskDetailsDependenciesProps> = ({
    taskId,
    disabled,
    onAddDependencies,
}) => {
    const { tasks, isLoading } = useDependants(taskId);

    return (
        <>
            {tasks.length === 0 ? (
                <Row>
                    <Col justify="center">
                        <BlankSlate
                            icon={APPICONS.TASK}
                            title={translate("No dependencies")}
                            description={translate(
                                "This task does not have any dependencies yet Click the button below to add the first one"
                            )}
                            small
                            maxWidth={250}
                        >
                            {!disabled && (
                                <RoundButton
                                    id="td-dependencies"
                                    minimal
                                    title={translate("Add dependencies")}
                                    icon="plus"
                                    disabled={disabled}
                                    onClick={onAddDependencies}
                                    testId="task-details-add-dependencies"
                                />
                            )}
                        </BlankSlate>
                    </Col>
                </Row>
            ) : (
                <Grid padding={[0, 20]}>
                    {isLoading ? (
                        <Spinner />
                    ) : (
                        <>
                            <TaskItems parentId={taskId} tasks={tasks} showProject={true} />

                            {!disabled && (
                                <div>
                                    <RoundButton
                                        id="td-dependencies"
                                        minimal
                                        title={translate("Add dependencies")}
                                        icon="plus"
                                        disabled={disabled}
                                        onClick={onAddDependencies}
                                        testId="task-details-add-dependencies"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </Grid>
            )}
        </>
    );
};
