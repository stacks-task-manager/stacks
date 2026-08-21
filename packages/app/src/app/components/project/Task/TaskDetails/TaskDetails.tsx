// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    AnchorButton,
    Button,
    Checkbox,
    Classes,
    Colors,
    Dialog,
    Drawer,
    Popover,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import classNames from "classnames";
import noop from "lodash/noop";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useLocation, useNavigate } from "react-router-dom";

import { IBackgroundLocationState, ITask, PRIORITY, ROLE_SECTIONS } from "@stacks/types";
import { Comments, CommentsInput } from "app/components";
import { AccessGate, Col, DropZone, Grid, Icon, LazyLoad, Row, Scroller } from "app/components/common";
import { Subtasks, TaskDescription, TaskDetailsSection, TaskTitle } from "app/components/project";
import {
    useCanAccess,
    useMousetrap,
    useOnClickOutside,
    usePreferences,
    useTask,
    useTaskDetailsShell,
} from "app/hooks";
import { getHashPathname, getHashSearch } from "app/hooks/router";
import { TasksActions } from "app/store/actions";
import { PreferencesStore } from "app/store/preferences";
import { scrollIntoView } from "app/utils/dom";
import { getFilesFromEvent } from "app/utils/drop";
import {
    LocaleDatePicker,
    TaskDetailsAddSubtaskButton,
    TaskDetailsAddTime,
    TaskDetailsCommentsButton,
    TaskDetailsCustomFields,
    TaskDetailsFullscreenButton,
    TaskDetailsNavigation,
    TaskDetailsNotification,
    TaskDetailsTaskPickerDialog,
    TaskDetailsTimer,
} from "app/widgets";
import { EditTaskDetailsLayout } from "./EditTaskDetailsLayout";
import { TaskDetailInfo } from "./TaskDetailInfo";
import { TaskDetailsMatrix } from "./TaskDetailsMatrix";
import { TaskDetailsMenu } from "./TaskDetailsMenu";
import { TaskDetailsTabs } from "./TaskDetailsTabs";

export const TaskDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isLoading, task, projectId, taskId, fullscreen, handleToggleFullscreen } = useTaskDetailsShell();

    const tdRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setTimeout(() => {
            scrollIntoView(document.getElementById(`task-details-${taskId}`), { behavior: "smooth" });
        }, 100);
    }, [taskId]);

    const closeTask = () => {
        if (getHashPathname().startsWith("/mytasks")) {
            navigate("/mytasks");
            return;
        }
        if (getHashPathname().startsWith("/tasks")) {
            const search = getHashSearch();
            navigate({ pathname: "/tasks", search: search || undefined });
            return;
        }

        if (location.pathname === getHashPathname()) {
            navigate(`/project/${projectId}`);
        }
    };

    const handleClose = (delayed?: boolean | number) => {
        if (delayed) {
            setTimeout(closeTask, typeof delayed === "number" ? delayed : 500);
        } else {
            closeTask();
        }
    };

    useOnClickOutside(tdRef, () => PreferencesStore.get().clickOutsideClose && handleClose(100), [
        ".td-keep",
        `.${Classes.PORTAL}`,
        ".tippy-content",
        ".tiptap-bubble-menu",
    ]);

    const handleOpenParentTask = async (parentId: string) => {
        navigate(`/project/${projectId}/${parentId}`);
    };

    return (
        <div
            className={classNames(["task-details-drawer embedded", Classes.DRAWER, Classes.POSITION_RIGHT], {
                fullscreen,
                "has-tint": task?.tint != null,
            })}
            style={{ borderColor: task?.tint || undefined }}
            ref={tdRef}
            data-testid="task-details-drawer"
        >
            {isLoading && <TaskDetailsLoading onClose={handleClose} />}
            {task && !isLoading && (
                <Task
                    task={task}
                    fullscreen={fullscreen}
                    onOpenParent={handleOpenParentTask}
                    onClose={handleClose}
                    onFullscreen={handleToggleFullscreen}
                />
            )}
        </div>
    );
};

export const TaskDetailsPanel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const backgroundLocation = (location.state as IBackgroundLocationState).backgroundLocation;
    const [open, setOpen] = useState(true);
    const { isLoading, task, taskId, fullscreen, handleToggleFullscreen } = useTaskDetailsShell();

    useEffect(() => {
        if (!backgroundLocation) {
            navigate("/");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    const handleDialogClose = () => {
        handleClose();
    };

    const handleClose = (delayed?: boolean) => {
        if (delayed) {
            setTimeout(() => {
                setOpen(false);
            }, 500);
        } else {
            setOpen(false);
        }
    };

    const handleDialogClosed = () => {
        navigate({
            pathname: backgroundLocation.pathname || "/",
            search: backgroundLocation.search,
            hash: backgroundLocation.hash,
        });
    };

    const handleOpenParentTask = (parentId: string) => {
        navigate(`/task/${parentId}`, {
            state: { backgroundLocation },
        });
    };

    if (PreferencesStore.get().dialogTask) {
        return (
            <Dialog
                isOpen={open}
                onClose={handleDialogClose}
                onClosed={handleDialogClosed}
                className={classNames("task-details-dialog", { fullscreen, "has-tint": task?.tint != null })}
                portalClassName="task-details-portal"
                style={{ borderColor: task?.tint || undefined }}
                aria-label={translate("Task details")}
                data-testid="task-details-drawer"
            >
                {isLoading && <TaskDetailsLoading onClose={handleClose} />}
                {task && !isLoading && (
                    <Task
                        task={task}
                        fullscreen={fullscreen}
                        onOpenParent={handleOpenParentTask}
                        onClose={handleClose}
                        onFullscreen={handleToggleFullscreen}
                        isDialog
                    />
                )}
            </Dialog>
        );
    } else {
        return (
            <Drawer
                className={classNames("task-details-drawer", { fullscreen })}
                isOpen={open}
                onClose={handleDialogClose}
                onClosed={handleDialogClosed}
                data-testid="task-details-drawer"
            >
                {isLoading && <TaskDetailsLoading onClose={handleClose} />}
                {task && !isLoading && (
                    <Task
                        task={task}
                        fullscreen={fullscreen}
                        onOpenParent={handleOpenParentTask}
                        onClose={handleClose}
                        onFullscreen={handleToggleFullscreen}
                    />
                )}
            </Drawer>
        );
    }
};

interface ITaskProps {
    task: ITask;
    fullscreen?: boolean;
    isDialog?: boolean;
    // backgroundLocation: Location;
    onOpenParent: (parentTaskId: string) => void;
    onClose: (delayed?: boolean) => void;
    onFullscreen?: () => void;
}
// eslint-disable-next-line react/display-name
const Task: FunctionComponent<ITaskProps> = React.memo(
    ({ task, fullscreen, isDialog, onOpenParent, onClose, onFullscreen }) => {
        const { task: parentTask } = useTask(task?.parent);
        const [showTaskPicker, setShowTaskPicker] = useState(false);

        const onDrop = useCallback(() => {
            // File-drop wiring on the details panel is still pending.
        }, []);
        const isArchived = task.archived !== null;
        const disabled = isArchived || task.done;

        const { getRootProps, isDragActive } = useDropzone({
            onDrop,
            noClick: true,
            disabled,
            getFilesFromEvent,
        });

        const { taskDetailsRows, taskDetailsComments, taskDetailsSubtasks, taskDetailsTime } = usePreferences(
            ["taskDetailsRows", "taskDetailsComments", "taskDetailsSubtasks", "taskDetailsTime"]
        );

        const handleTogglePrivacy = useCallback(async () => {
            await TasksActions.togglePrivacy(task.id);
        }, [task.id]);

        const taskPrivacyIcon = useMemo(() => {
            if (task.permissions.isPublic || isArchived) return null;

            return (
                <Tooltip content={translate("This task is private")} placement="bottom-end">
                    <Button
                        size="small"
                        variant="minimal"
                        icon={<Icon icon="shield-tick" color={Colors.RED3} />}
                        onClick={handleTogglePrivacy}
                    />
                </Tooltip>
            );
        }, [task.permissions.isPublic, isArchived, handleTogglePrivacy]);

        const handleDeleteTask = async () => {
            const response = await TasksActions.alertDelete(task.id);

            if (response) {
                onClose();
            }
        };

        useMousetrap("shift+backspace", () => handleDeleteTask());

        const handleOpenParentTask = () => {
            if (!onOpenParent || !task.parent) return;

            onOpenParent(task.parent);
        };

        const handleSelectParentTask = (parentTaskId: string) => {
            setShowTaskPicker(false);
            TasksActions.attach(task.id, parentTaskId);
        };

        return (
            <div
                className={classNames("task-details-header-wrapper", { fullscreen })}
                data-testid="task-details"
                {...getRootProps()}
                onFocus={noop}
                onBlur={noop}
            >
                <div className={Classes.DRAWER_HEADER} data-testid="task-details-header">
                    <Row>
                        <Col align="center">
                            {taskPrivacyIcon}
                            {!isArchived && taskDetailsTime ? (
                                <AccessGate section={ROLE_SECTIONS.TIMELOGS} fallback={false}>
                                    <TaskDetailsTimer taskId={task.id} disabled={disabled} />
                                </AccessGate>
                            ) : null}

                            {!isArchived && taskDetailsTime ? (
                                <AccessGate section={ROLE_SECTIONS.TIMELOGS} fallback={false}>
                                    <TaskDetailsAddTime
                                        taskId={task.id}
                                        projectId={task.project}
                                        disabled={disabled}
                                    />
                                </AccessGate>
                            ) : null}

                            {!isArchived && <TaskDetailsNotification task={task} disabled={disabled} />}
                            {task.done && (
                                <Popover
                                    content={
                                        <LocaleDatePicker
                                            highlightCurrentDay
                                            defaultValue={
                                                task.completed ? new Date(task.completed) : undefined
                                            }
                                            onChange={(date, isUserChanged) => {
                                                if (isUserChanged && date) {
                                                    TasksActions.setCompletedDate(task.id, date);
                                                }
                                            }}
                                        />
                                    }
                                >
                                    <Tooltip
                                        content={translate("Update task completed date")}
                                        placement="bottom"
                                    >
                                        <AnchorButton
                                            size="small"
                                            variant="minimal"
                                            icon={<Icon icon="calendar-check-02" />}
                                        />
                                    </Tooltip>
                                </Popover>
                            )}
                        </Col>
                        {!isArchived && (
                            <Col justify="center" align="center" gap={5}>
                                <TaskDetailsNavigation stackId={task.stack} taskId={task.id} />
                            </Col>
                        )}
                        <Col justify="right">
                            {!isArchived && taskDetailsSubtasks ? (
                                <TaskDetailsAddSubtaskButton disabled={disabled} />
                            ) : null}

                            {taskDetailsComments ? (
                                <TaskDetailsCommentsButton taskId={task.id} count={task.comments} />
                            ) : null}

                            <Popover
                                content={
                                    <TaskDetailsMenu
                                        task={task}
                                        archived={isArchived}
                                        disabled={task.done}
                                        onClose={onClose}
                                        onTogglePrivacy={handleTogglePrivacy}
                                        onToggleParent={() => setShowTaskPicker(true)}
                                    />
                                }
                                placement="bottom-end"
                            >
                                <Button
                                    size="small"
                                    variant="minimal"
                                    icon={<Icon icon="dots-vertical" />}
                                    data-testid="task-details-menu-button"
                                />
                            </Popover>

                            {onFullscreen != null ? (
                                <TaskDetailsFullscreenButton
                                    isFullscreen={fullscreen}
                                    onToggle={onFullscreen}
                                />
                            ) : null}

                            {!fullscreen ? (
                                <Tooltip content={translate("Close task details")} placement="bottom-end">
                                    <Button
                                        size="small"
                                        variant="minimal"
                                        icon={<Icon icon={isDialog ? "x-close" : "align-right-01"} />}
                                        onClick={() => onClose()}
                                        data-testid="task-details-close-button"
                                    />
                                </Tooltip>
                            ) : null}
                        </Col>
                    </Row>

                    {showTaskPicker && task.parent == null ? (
                        <TaskDetailsTaskPickerDialog
                            taskId={task.id}
                            projectId={task.project}
                            onClose={() => setShowTaskPicker(false)}
                            onChange={handleSelectParentTask}
                        />
                    ) : null}
                </div>
                <div className="task-details-main" data-testid="task-details-body">
                    <Scroller className={Classes.DRAWER_BODY} thin vertical shadows>
                        <div id={`task-details-${task.id}`} />
                        <Grid gap={30}>
                            <Row padding={30}>
                                <Col>
                                    <Grid gap={10}>
                                        {task?.parent && (
                                            <Row>
                                                <Col>
                                                    <a
                                                        onClick={handleOpenParentTask}
                                                        className="task-details-parent-link"
                                                        data-testid="task-details-parent-link"
                                                    >
                                                        <Icon icon="chevron-left" />
                                                        &nbsp;
                                                        {parentTask
                                                            ? parentTask.title.substring(0, 50)
                                                            : translate("Go to parent task")}
                                                    </a>
                                                </Col>
                                            </Row>
                                        )}

                                        <TaskTitle
                                            task={task}
                                            onChange={(title: string) =>
                                                TasksActions.setTitle(task.id, title)
                                            }
                                            onToggleAssignee={(assigneeId: string) =>
                                                TasksActions.toggleAssignee(task.id, assigneeId)
                                            }
                                            onToggleTag={(tagid: string) =>
                                                TasksActions.toggleTag(task.id, tagid)
                                            }
                                            onSetStatus={(statusId: string) =>
                                                TasksActions.setStatus(task.id, statusId)
                                            }
                                            onSetPriority={(priority: PRIORITY) =>
                                                TasksActions.setPriority(task.id, priority)
                                            }
                                            disabled={disabled}
                                        />
                                    </Grid>
                                </Col>
                            </Row>
                            <Row padding={30}>
                                <Col>
                                    <TaskDetailsSection title={translate("Description")} vertical>
                                        {task && (
                                            <TaskDescription
                                                taskId={task.id}
                                                value={task.description}
                                                placeholder={translate("Edit task description")}
                                                disabled={disabled}
                                            />
                                        )}
                                    </TaskDetailsSection>
                                </Col>
                            </Row>

                            <span />
                        </Grid>

                        <Grid gap={30}>
                            <EditTaskDetailsLayout />

                            <TaskDetailsMatrix task={task} disabled={disabled} onClose={onClose} />

                            <Row padding={30}>
                                <Col>
                                    <Grid gap={20}>
                                        {taskDetailsRows?.map((row, rowIndex) => (
                                            <TaskDetailInfo
                                                key={rowIndex}
                                                section={row}
                                                task={task}
                                                onClose={onClose}
                                                centered
                                                disabled={disabled}
                                            />
                                        ))}
                                        <TaskDetailsCustomFields
                                            values={task.fields}
                                            taskId={task.id}
                                            projectId={task.project}
                                        />
                                    </Grid>
                                </Col>
                            </Row>

                            {task && taskDetailsSubtasks ? (
                                <Subtasks parent={task} disabled={disabled} />
                            ) : null}

                            <Row padding={30}>
                                <Col>
                                    <div style={{ height: 1, width: "100%" }} />
                                </Col>
                            </Row>

                            {!isDialog && <TaskDetailsTabs task={task} disabled={disabled} />}
                        </Grid>

                        {taskDetailsComments && !isDialog ? (
                            <>
                                <div id="comments" className="task-details-divider" />

                                <LazyLoad stayRendered>
                                    <Comments resourceId={task.id} disabled={disabled} />
                                </LazyLoad>
                            </>
                        ) : null}
                    </Scroller>

                    {!disabled && isDragActive ? <DropZone /> : null}

                    <Scroller parentClassName="task-details-sidebar" vertical thin>
                        {isDialog && <TaskDetailsTabs task={task} disabled={disabled} />}
                        {taskDetailsComments && isDialog ? (
                            <>
                                <div id="comments" className="task-details-divider" />

                                <LazyLoad stayRendered className="task-details-comments-wrapper">
                                    <Comments resourceId={task.id} disabled={disabled} />
                                </LazyLoad>
                            </>
                        ) : null}

                        <TaskDetailsCommentsInput
                            taskId={task.id}
                            projectId={task.project}
                            show={!isArchived && taskDetailsComments}
                        />
                    </Scroller>
                </div>
            </div>
        );
    }
);

interface TaskDetailsCommentsInputProps {
    taskId: string;
    projectId: string;
    show?: boolean;
}
const TaskDetailsCommentsInput: FunctionComponent<TaskDetailsCommentsInputProps> = ({
    taskId,
    projectId,
    show,
}) => {
    const { write } = useCanAccess(ROLE_SECTIONS.COMMENTS);

    if (!show || !write) {
        return null;
    }

    return <CommentsInput resourceId={taskId} parentId={projectId} />;
};

interface ITaskDetailsLoadingProps {
    onClose: () => void;
}
const TaskDetailsLoading: FunctionComponent<ITaskDetailsLoadingProps> = ({ onClose }) => {
    return (
        <>
            <div className={Classes.DRAWER_HEADER}>
                <div>
                    <Checkbox label="Mark as done" className={Classes.SKELETON} />
                </div>
                <div>
                    <Button className={Classes.SKELETON} /> &nbsp;
                    <Button className={Classes.SKELETON} /> &nbsp;
                    <Button className={Classes.SKELETON} /> &nbsp;
                    <Tooltip content={translate("Close task")} placement="bottom-end">
                        <Button
                            size="small"
                            variant="minimal"
                            icon={<Icon icon="close" />}
                            onClick={onClose}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={Classes.DRAWER_BODY}>
                <Grid gap={30}>
                    <Row padding={30}>
                        <Col>
                            <Grid gap={10}>
                                <Grid gap={5}>
                                    <div className={Classes.SKELETON} style={{ height: 40 }}>
                                        Lorem ipsum dolor
                                    </div>

                                    <small className={Classes.SKELETON} style={{ width: "75%" }}>
                                        Lorem ipsum sit amet dates here
                                    </small>
                                </Grid>
                            </Grid>
                        </Col>
                    </Row>
                    <Row padding={30}>
                        <Col>
                            <TaskDetailsSection title="Description" vertical isLoading>
                                <div className={Classes.SKELETON} style={{ height: 80 }} />
                            </TaskDetailsSection>
                        </Col>
                    </Row>

                    <span />
                </Grid>

                <Grid gap={30}>
                    <div className="task-details-divider" />

                    <Row gutter={20} padding={30}>
                        <TaskDetailsSection title="Lorem ipsum" vertical isLoading>
                            <div className={Classes.SKELETON} style={{ height: 40 }} />
                        </TaskDetailsSection>
                        <TaskDetailsSection title="Lorem ipsum" vertical isLoading>
                            <div className={Classes.SKELETON} style={{ height: 40 }} />
                        </TaskDetailsSection>
                        <TaskDetailsSection title="Lorem ipsum" vertical isLoading>
                            <div className={Classes.SKELETON} style={{ height: 40 }} />
                        </TaskDetailsSection>
                    </Row>
                    <Row gutter={20} padding={30}>
                        <TaskDetailsSection title="Lorem ipsum" vertical isLoading>
                            <div className={Classes.SKELETON} style={{ height: 40 }} />
                        </TaskDetailsSection>
                        <TaskDetailsSection title="Lorem ipsum" vertical isLoading>
                            <div className={Classes.SKELETON} style={{ height: 40 }} />
                        </TaskDetailsSection>
                        <TaskDetailsSection title="Lorem ipsum" vertical isLoading>
                            <div className={Classes.SKELETON} style={{ height: 40 }} />
                        </TaskDetailsSection>
                    </Row>

                    <Row padding={30}>
                        <Col>
                            <Grid gap={20}>
                                <TaskDetailsSection title="Lorem ipsum" centered isLoading>
                                    <div className={Classes.SKELETON} style={{ height: 20, width: "100%" }} />
                                </TaskDetailsSection>
                                <TaskDetailsSection title="Lorem ipsum" centered isLoading>
                                    <div className={Classes.SKELETON} style={{ height: 20, width: "100%" }} />
                                </TaskDetailsSection>
                                <TaskDetailsSection title="Lorem ipsum" centered isLoading>
                                    <div className={Classes.SKELETON} style={{ height: 20, width: "100%" }} />
                                </TaskDetailsSection>
                            </Grid>
                        </Col>
                    </Row>

                    <Row padding={30}>
                        <Col>
                            <div style={{ height: 1, width: "100%" }} />
                        </Col>
                    </Row>

                    <Row padding={30} justify="left" gutter={20}>
                        <Col width={100} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 100 }} />
                        </Col>
                        <Col width={100} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 100 }} />
                        </Col>
                        <Col width={100} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 100 }} />
                        </Col>
                        <Col width={100} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 100 }} />
                        </Col>
                    </Row>
                    <Row padding={30}>
                        <Col>
                            <div className={Classes.SKELETON} style={{ height: 150, width: "100%" }} />
                        </Col>
                    </Row>

                    <div id="comments" className="task-details-divider" />

                    <Row padding={30} gutter={20}>
                        <Col width={30} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 30 }} />
                        </Col>
                        <Col>
                            <div className={Classes.SKELETON} style={{ height: 50, width: "100%" }} />
                        </Col>
                    </Row>

                    <Row padding={30} gutter={20}>
                        <Col width={30} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 30 }} />
                        </Col>
                        <Col>
                            <div className={Classes.SKELETON} style={{ height: 50, width: "100%" }} />
                        </Col>
                    </Row>

                    <Row padding={30} gutter={20}>
                        <Col width={30} unshrinkable>
                            <div className={Classes.SKELETON} style={{ height: 30, width: 30 }} />
                        </Col>
                        <Col>
                            <div className={Classes.SKELETON} style={{ height: 50, width: "100%" }} />
                        </Col>
                    </Row>
                </Grid>
            </div>
        </>
    );
};
