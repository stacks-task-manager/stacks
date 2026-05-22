// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Divider, Intent, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Col, Grid, Row, Scroller } from "app/components/common";
import {
    TaskDetailsAssignees,
    TaskDetailsPriority,
    TaskDetailsProjects,
    TaskDetailsSection,
    TaskDetailsStack,
    TaskState,
} from "app/components/project";
import { useTask } from "app/hooks";
import { TaskDetailsStatus } from "app/widgets/status";
import { TaskDetailsTags } from "../TaskDetailsTags/TaskDetailsTags";

interface TaskInfoPopupProps {
    taskId: string;
    children: React.ReactNode;
}
export const TaskInfoPopup: FunctionComponent<TaskInfoPopupProps> = ({ taskId, children }) => {
    return (
        <Popover content={<TaskInfo taskId={taskId} />} popoverClassName="popover-padded">
            {children}
        </Popover>
    );
};

export default TaskInfoPopup;

interface TaskInfoProps {
    taskId: string;
}
export const TaskInfo: FunctionComponent<TaskInfoProps> = ({ taskId }) => {
    const { task } = useTask(taskId);
    const location = useLocation();
    const navigate = useNavigate();

    if (!task) {
        return <>Task not found</>;
    }

    const handleOpenTask = () => {
        navigate(`/task/${task.id}`, {
            state: { backgroundLocation: location },
        });
    };

    return (
        <div style={{ width: 400 }}>
            <Grid>
                <Scroller thin vertical maxHeight={400}>
                    <Grid>
                        <Row gutter={10}>
                            <Col width="auto">
                                <TaskState taskId={task.id} />
                            </Col>
                            <Col>
                                <h5 className={Classes.HEADING} style={{ marginBottom: 0 }}>
                                    {task.title}
                                </h5>
                            </Col>
                        </Row>

                        <Grid gap={10}>
                            <TaskDetailsSection title={translate("Assignees")} width={100}>
                                <TaskDetailsAssignees
                                    assignees={task.assignees || []}
                                    disabled
                                    taskId={task.id}
                                />
                            </TaskDetailsSection>

                            <TaskDetailsSection title={translate("Status")} width={100}>
                                <TaskDetailsStatus value={task.status} disabled taskId={task.id} />
                            </TaskDetailsSection>

                            <TaskDetailsSection title={translate("Tags")} width={100}>
                                <TaskDetailsTags value={task.tags} disabled taskId={task.id} />
                            </TaskDetailsSection>

                            <TaskDetailsSection title={translate("Priority")} width={100}>
                                <TaskDetailsPriority
                                    value={task.priority}
                                    showEmpty
                                    canClear
                                    disabled
                                    taskId={task.id}
                                />
                            </TaskDetailsSection>

                            <TaskDetailsStack
                                taskId={task.id}
                                projectId={task.project}
                                stackId={task.stack}
                                disabled
                                width={100}
                            />

                            <TaskDetailsSection title={translate("Project")} width={100}>
                                <TaskDetailsProjects projectId={task.project} taskId={task.id} />
                            </TaskDetailsSection>
                        </Grid>
                    </Grid>
                </Scroller>

                <Grid gap={5}>
                    <Divider />

                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button className={Classes.POPOVER_DISMISS} variant="minimal">
                            {translate("Cancel")}
                        </Button>
                        <Button
                            className={Classes.POPOVER_DISMISS}
                            intent={Intent.PRIMARY}
                            onClick={handleOpenTask}
                        >
                            Open task details
                        </Button>
                    </div>
                </Grid>
            </Grid>
        </div>
    );
};
