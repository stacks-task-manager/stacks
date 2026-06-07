// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    AnchorButton,
    Button,
    Checkbox,
    Classes,
    Colors,
    Dialog,
    Drawer,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Tab,
    Tabs,
    Tag,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import classNames from "classnames";
import noop from "lodash/noop";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DropEvent, FileWithPath, useDropzone } from "react-dropzone";
import { useLocation, useNavigate } from "react-router-dom";

import {
    APPICONS,
    COPYMOVETYPE,
    IBackgroundLocationState,
    ITask,
    PRIORITY,
    ROLE_SECTIONS,
    TASKDETAILMATRIX,
} from "@stacks/types";
import { Comments, CommentsInput } from "app/components";
import {
    AccessGate,
    Col,
    DatePickerButton,
    DropZone,
    Grid,
    HotkeyChip,
    Icon,
    LazyLoad,
    Row,
    Scroller,
} from "app/components/common";
import {
    DependenciesCount,
    FeeInput,
    Subtasks,
    TIRepeats,
    TaskDescription,
    TaskDetailsAssignees,
    TaskDetailsAttachments,
    TaskDetailsDependencies,
    TaskDetailsId,
    TaskDetailsLinks,
    TaskDetailsPriority,
    TaskDetailsProgress,
    TaskDetailsProjects,
    TaskDetailsSection,
    TaskDetailsStack,
    TaskDetailsTint,
    TaskEstimates,
    TaskSpentProgress,
    TaskTitle,
} from "app/components/project";
import {
    getProject,
    publish,
    useCanAccess,
    useCurrentTask,
    useMousetrap,
    useOnClickOutside,
    usePreferences,
    useTask,
} from "app/hooks";
import { getHashPathname, getHashSearch } from "app/hooks/router";
import { TasksActions } from "app/store/actions";
import { CopyMoveActions } from "app/store/actions/copymove";
import { RecentsActions } from "app/store/actions/recents";
import { toggleNewBookmark, togglePreferences } from "app/store/global";
import { PreferencesStore } from "app/store/preferences";
import { formatStringDuration } from "app/utils/date";
import { scrollIntoView } from "app/utils/dom";
import { stripMd } from "app/utils/string";
import { share } from "app/utils/url";
import {
    LocaleDatePicker,
    StacksMenu,
    TaskDetailsAddSubtaskButton,
    TaskDetailsAddTime,
    TaskDetailsCommentsButton,
    TaskDetailsCustomFields,
    TaskDetailsDueDate,
    TaskDetailsFullscreenButton,
    TaskDetailsNavigation,
    TaskDetailsNotification,
    TaskDetailsStartDate,
    TaskDetailsStatus,
    TaskDetailsTags,
    TaskDetailsTaskPickerDialog,
    TaskDetailsTimer,
} from "app/widgets";
import { TaskDetailsCover } from "../TaskDetailsCover/TaskDetailsCover";
import { TaskDetailsLocations } from "../TaskDetailsLocations/TaskDetailsLocations";
import { TaskDetailsTimelogsTab } from "../TaskDetailsTimeLogs/TaskDetailsTimeLogs";

export const TaskDetails = () => {
    const [fullscreen, setFullscreen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { isLoading, task, projectId, taskId } = useCurrentTask();

    const tdRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setTimeout(() => {
            scrollIntoView(document.getElementById(`task-details-${taskId}`), { behavior: "smooth" });
        }, 100);
    }, [taskId]);

    useEffect(() => {
        if (!task) return;
        RecentsActions.add({
            title: task.title,
            icon: APPICONS.TASK,
            url: `/task/${task.id}`,
        });
    }, [task]);

    const closeTask = () => {
        if (window.location.hash.startsWith("#/mytasks")) {
            navigate("/mytasks");
            return;
        }
        if (window.location.hash.startsWith("#/tasks")) {
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

    const handleToggleFullscreen = () => {
        setFullscreen(!fullscreen);
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
    const [fullscreen, setFullscreen] = useState(false);
    const { isLoading, task, taskId } = useCurrentTask();

    useEffect(() => {
        if (!backgroundLocation) {
            navigate("/");
        }
    }, [taskId]);

    useEffect(() => {
        if (!task) return;
        RecentsActions.add({
            title: task.title,
            icon: APPICONS.TASK,
            url: `/task/${task.id}`,
        });
    }, [task]);

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

    const handleToggleFullscreen = () => {
        setFullscreen(!fullscreen);
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
                aria-labelledby="task-details-panel"
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

        const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
            const paths = acceptedFiles.filter(f => f.path != null).map(f => f.path!);
            handleFilesDrop(paths);
        }, []);
        const isArchived = task.archived !== null;
        const disabled = isArchived || task.done;

        const getFilesFromEvent = async (event: DropEvent) => {
            const { dataTransfer } = event as React.DragEvent<HTMLElement>;

            const files = Array.from(dataTransfer.files).map(file => ({
                ...file,
                path: window.getPathForFile(file),
            }));
            return files as File[];
        };

        const { getRootProps, isDragActive } = useDropzone({
            onDrop,
            noClick: true,
            disabled,
            getFilesFromEvent,
        });

        const { taskDetailsRows, taskDetailsComments, taskDetailsSubtasks, taskDetailsTime } = usePreferences(
            ["taskDetailsRows", "taskDetailsComments", "taskDetailsSubtasks", "taskDetailsTime"]
        );

        const handleTogglePrivacy = async () => {
            await TasksActions.togglePrivacy(task.id);
        };

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
        }, [task.permissions.isPublic, isArchived]);

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

        const handleFilesDrop = (_files: string[]) => {
            // TasksActions.uploadAttachments(task.id, _files);
            // File-drop wiring on the details panel is still pending.
        };

        const handleSelectParentTask = (parentTaskId: string) => {
            setShowTaskPicker(false);
            TasksActions.attach(task.id, parentTaskId);
        };

        return (
            <div
                className="task-details-header-wrapper"
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
                            {/* {archived ? (
                                <Tooltip
                                    content={
                                        <>
                                            {translate("Archived on")}{" "}
                                            {formatDate(task?.archived)}
                                        </>
                                    }
                                    placement="left"
                                >
                                    <Tag intent={Intent.PRIMARY} active round>
                                        Task is archived
                                    </Tag>
                                </Tooltip>
                            ) : (
                                <TaskDetailsState
                                    taskId={task.id}
                                    isComplete={task?.done}
                                    onClose={onClose}
                                />
                            )} */}
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
                                    <Tooltip content={translate("Update task completed date")} placement="bottom">
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
                                <Button size="small" variant="minimal" icon={<Icon icon="dots-vertical" />} />
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

interface TaskDetailsTabsProps {
    task: ITask;
    disabled?: boolean;
}
const TaskDetailsTabs: FunctionComponent<TaskDetailsTabsProps> = ({ task, disabled }) => {
    const [activeTab, setActiveTab] = useState("files");

    const {
        taskDetailsSubtasks,
        taskDetailsLocations,
        taskDetailsLinks,
        taskDetailsTime,
        taskDetailsAttachments,
        taskDetailsDependencies,
    } = usePreferences([
        "taskDetailsSubtasks",
        "taskDetailsLocations",
        "taskDetailsLinks",
        "taskDetailsTime",
        "taskDetailsAttachments",
        "taskDetailsDependencies",
    ]);

    const showTabs = useMemo(() => {
        return (
            taskDetailsSubtasks ||
            taskDetailsLocations ||
            taskDetailsLinks ||
            taskDetailsTime ||
            taskDetailsAttachments ||
            taskDetailsDependencies
        );
    }, [
        taskDetailsSubtasks,
        taskDetailsLocations,
        taskDetailsLinks,
        taskDetailsTime,
        taskDetailsAttachments,
        taskDetailsDependencies,
    ]);

    if (!showTabs) return null;

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    const dependenciesCount = <DependenciesCount taskId={task.id} />;

    return (
        <Tabs id="options" selectedTabId={activeTab} renderActiveTabPanelOnly onChange={handleTabChange}>
            {task && taskDetailsAttachments ? (
                <Tab
                    id="files"
                    title={translate("Files")}
                    // tagContent={
                    //     task && task.attachments && task?.attachments.length > 0
                    //         ? task?.attachments.length
                    //         : undefined
                    // }
                    panel={<TaskDetailsAttachments taskId={task.id} disabled={disabled} />}
                />
            ) : null}
            {taskDetailsDependencies && (
                <Tab
                    id="dependencies"
                    title={translate("Dependencies")}
                    tagContent={dependenciesCount && undefined}
                    panel={<TaskDetailsDependencies taskId={task.id} disabled={disabled} />}
                />
            )}
            {taskDetailsTime ? (
                // <TaskDetailsTimelogsTab taskId={task.id} disabled={disabled} projectId={task.project} />
                <Tab
                    id="timelogs"
                    title={translate("Time entries")}
                    panel={
                        <TaskDetailsTimelogsTab
                            taskId={task.id}
                            projectId={task.project}
                            disabled={disabled}
                        />
                    }
                />
            ) : null}
            {taskDetailsLinks ? (
                <Tab
                    id="links"
                    title={translate("Links")}
                    tagContent={task && task.links && task.links.length > 0 ? task.links.length : undefined}
                    panel={<TaskDetailsLinks taskId={task.id} links={task.links} disabled={disabled} />}
                />
            ) : null}
            {taskDetailsLocations ? (
                <Tab
                    id="locations"
                    title={translate("Locations")}
                    tagContent={
                        task && task.locations && task.locations.length > 0
                            ? task?.locations.length
                            : undefined
                    }
                    panel={
                        <TaskDetailsLocations
                            taskId={task.id}
                            locations={task.locations}
                            disabled={disabled}
                        />
                    }
                />
            ) : null}
        </Tabs>
    );
};

function twoDimensional<T>(list: T[], elementsPerSubArray: number) {
    const matrix: T[][] = [];
    let i, k;

    for (i = 0, k = -1; i < list.length; i++) {
        if (i % elementsPerSubArray === 0) {
            k++;
            matrix[k] = [];
        }

        matrix[k].push(list[i]);
    }

    return matrix;
}

interface ITaskDetailsMatrixProps {
    task: ITask;
    disabled?: boolean;
    onClose: (delayed?: boolean) => void;
}
// eslint-disable-next-line react/display-name
const TaskDetailsMatrix: FunctionComponent<ITaskDetailsMatrixProps> = React.memo(
    ({ task, disabled, onClose }) => {
        const { taskDetailsMatrix } = usePreferences(["taskDetailsMatrix"]);

        return (
            <>
                {twoDimensional<TASKDETAILMATRIX | undefined>(taskDetailsMatrix!, 3).map((row, rowIndex) => {
                    if (!row.some(row => row != null)) return null;
                    return (
                        <Row gutter={20} padding={30} key={rowIndex}>
                            {row.map((col, colIndex) => {
                                return (
                                    <TaskDetailInfo
                                        task={task}
                                        section={col}
                                        key={colIndex}
                                        onClose={onClose}
                                        vertical
                                        disabled={disabled}
                                    />
                                );
                            })}
                        </Row>
                    );
                })}
            </>
        );
    }
);

interface ITaskDetailInfoProps {
    task: ITask;
    section: TASKDETAILMATRIX | undefined;
    vertical?: boolean;
    centered?: boolean;
    disabled?: boolean;
    onClose: (delayed?: boolean) => void;
}
// eslint-disable-next-line react/display-name
const TaskDetailInfo: FunctionComponent<ITaskDetailInfoProps> = React.memo(
    ({ task, section, vertical, centered, disabled, onClose }) => {
        switch (section) {
            case TASKDETAILMATRIX.ASSIGNEES:
                return (
                    <TaskDetailsSection
                        title={translate("Assignees")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <TaskDetailsAssignees
                            taskId={task.id}
                            assignees={task.assignees || []}
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.PRIORITY:
                return (
                    <TaskDetailsSection title={translate("Priority")} vertical={vertical} centered={centered}>
                        <TaskDetailsPriority
                            taskId={task.id}
                            value={task.priority ?? PRIORITY.NONE}
                            showEmpty
                            canClear
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.STATUS:
                return (
                    <TaskDetailsSection title={translate("Status")} vertical={vertical} centered={centered}>
                        <TaskDetailsStatus
                            taskId={task.id}
                            value={task.status}
                            canClear
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.REPEATS:
                return (
                    <TaskDetailsSection title={translate("Repeats")} vertical={vertical} centered={centered}>
                        <TIRepeats taskId={task.id} value={task.repeats} disabled={disabled} />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.PROGRESS:
                return (
                    <TaskDetailsSection
                        title={translate("Progress")}
                        accessory={<HotkeyChip keys={[`${task?.progress || 0}%`]} light />}
                        vertical={vertical}
                        centered
                    >
                        <TaskDetailsProgress
                            taskId={task.id}
                            progress={task?.progress}
                            disabled={disabled}
                            onComplete={() => onClose(true)}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.DUEDATE:
                return (
                    <TaskDetailsSection title={translate("Due Date")} vertical={vertical} centered={centered}>
                        <TaskDetailsDueDate
                            value={task.duedate ?? null}
                            disabled={disabled}
                            minDate={task.startdate ?? undefined}
                            taskId={task.id}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.STARTDATE:
                return (
                    <TaskDetailsSection
                        title={translate("Start date")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <TaskDetailsStartDate
                            value={task.startdate ?? null}
                            disabled={disabled}
                            maxDate={task.duedate ?? undefined}
                            taskId={task.id}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.DODATE:
                return (
                    <TaskDetailsSection title={translate("Do date")} vertical={vertical} centered={centered}>
                        <DatePickerButton
                            extendedFormat
                            value={task.dodate ?? null}
                            disabled={disabled}
                            minDate={task.startdate ?? undefined}
                            maxDate={task.duedate ?? undefined}
                            onChange={(date: Date | null) => TasksActions.setDoDate(task.id, date)}
                            popoverProps={{
                                placement: "top",
                            }}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.TAGS:
                return (
                    <TaskDetailsSection title={translate("Tags")} vertical={vertical} centered={centered}>
                        <TaskDetailsTags value={task.tags} disabled={disabled} taskId={task.id} />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.ESTIMATE:
                return (
                    <TaskDetailsSection title={translate("Estimate")} vertical={vertical} centered={centered}>
                        <TaskEstimates
                            value={task.estimate}
                            disabled={disabled}
                            onChange={(value: number | undefined) => TasksActions.setEstimate(task.id, value)}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.TIMESPENT:
                return (
                    <TaskDetailsSection
                        title={translate("Time spent")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <Tooltip
                            content={translate("Time spent across all task time logs.")}
                            placement="top"
                            disabled={disabled}
                        >
                            <Tag minimal intent={Intent.SUCCESS}>
                                {formatStringDuration(task.timeSpent)}
                            </Tag>
                        </Tooltip>
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.PROJECTS:
                return (
                    <TaskDetailsSection title={translate("Project")} vertical={vertical} centered={centered}>
                        <TaskDetailsProjects taskId={task.id} projectId={task.project} />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.STACK:
                return (
                    <TaskDetailsStack
                        taskId={task.id}
                        projectId={task.project}
                        stackId={task.stack}
                        vertical={vertical}
                        centered={centered}
                        disabled={disabled}
                    />
                );

            case TASKDETAILMATRIX.SPENTPROGRESS:
                return (
                    <TaskDetailsSection
                        title={translate("Time progress")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <TaskSpentProgress
                            estimated={task.estimate || 0}
                            spent={task.timeSpent}
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );

            case TASKDETAILMATRIX.TINT:
                return (
                    <TaskDetailsTint
                        taskId={task.id}
                        tint={task.tint ?? undefined}
                        vertical={vertical}
                        centered={centered}
                        disabled={disabled}
                    />
                );

            case TASKDETAILMATRIX.COVER:
                return (
                    <TaskDetailsSection title={translate("Cover")} vertical={vertical} centered={centered}>
                        <TaskDetailsCover taskId={task.id} url={task.cover} disabled={disabled} />
                    </TaskDetailsSection>
                );

            case TASKDETAILMATRIX.ID:
                return <TaskDetailsId id={task.id} vertical={vertical} centered={centered} />;

            case TASKDETAILMATRIX.HOURLY_RATE:
                const project = getProject(task.project);
                return (
                    <TaskDetailsSection title={translate("Task hourly rate")} vertical={vertical} centered={centered}>
                        <FeeInput
                            value={task.hourlyRate}
                            currency={project?.currency}
                            readonly
                            placeholder={project?.hourlyRate ?? 0}
                            onChange={value => TasksActions.setHourlyRate(task.id, value)}
                        />
                    </TaskDetailsSection>
                );

            default:
                return null;
        }
    }
);

interface ITaskDetailsMenuProps {
    task: ITask;
    archived?: boolean;
    disabled?: boolean;
    onClose: (delayed?: boolean) => void;
    onTogglePrivacy: () => void;
    onToggleParent: () => void;
}
const TaskDetailsMenu: FunctionComponent<ITaskDetailsMenuProps> = ({
    task,
    archived,
    disabled,
    onClose,
    onTogglePrivacy,
    onToggleParent,
}) => {
    const handleToggleComplete = () => {
        TasksActions.toggleDone(task.id);
        if (!task.done) onClose(true);
    };

    const handleArchive = async () => {
        await TasksActions.archiveAlert(task.id);
        onClose(true);
    };

    const handleUnarchive = async (stackId?: string) => {
        await TasksActions.unarchive(task.id, stackId);
        onClose(true);
    };

    const handleDeleteTask = async () => {
        const response = await TasksActions.alertDelete(task.id);

        if (response) {
            onClose();
        }
    };

    const handleCopyMove = () => {
        CopyMoveActions.show({
            title: stripMd(task.title),
            type: COPYMOVETYPE.TASK,
            tasks: [task.id],
        });

        onClose();
    };

    const handleExport = (type: string) => {
        TasksActions.exportTask(task.id, type);
    };

    if (archived) {
        return (
            <Menu>
                <MenuItem
                    text={translate("Unarchive")}
                    intent={Intent.SUCCESS}
                    icon={<Icon icon="archive" />}
                    onClick={() => handleUnarchive()}
                />
                <MenuItem
                    text={translate("Unarchive to")}
                    intent={Intent.SUCCESS}
                    icon={<Icon icon="archive" />}
                >
                    <StacksMenu
                        projectId={task.project}
                        showTitle
                        onClick={handleUnarchive}
                        selected={undefined}
                        nested
                    />
                </MenuItem>
                <MenuDivider />
                <MenuItem
                    text={translate("Delete task", { suffix: "..." })}
                    intent={Intent.DANGER}
                    icon={<Icon icon="trash" />}
                    onClick={handleDeleteTask}
                />
            </Menu>
        );
    }

    return (
        <Menu>
            <MenuItem
                text={taskToggleDoneLabel(Boolean(task?.done))}
                intent={task?.done ? Intent.PRIMARY : Intent.SUCCESS}
                icon={<Icon icon={task?.done ? "circle" : "check-circle"} />}
                onClick={handleToggleComplete}
            />

            <MenuDivider />
            <MenuItem
                text={translate("Bookmark")}
                icon={<Icon icon="bookmark" />}
                onClick={toggleNewBookmark}
            />
            <MenuItem
                text={translate("Share link")}
                icon={<Icon icon="link-01" />}
                onClick={() => share(`t/${task.id}`)}
            />
            <MenuDivider />
            <MenuItem
                text={translate("Copy or Move")}
                icon={<Icon icon="clipboard" />}
                disabled={disabled}
                onClick={handleCopyMove}
            />
            <MenuItem text={translate("Export")} icon={<Icon icon="download-04" />}>
                <MenuItem
                    text={translate("Export as", { type: ".xlsx" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("csv")}
                />
                <MenuItem
                    text={translate("Export as", { type: ".json" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("json")}
                />
                <MenuItem
                    text={translate("Export as", { type: ".pdf" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("pdf")}
                />
            </MenuItem>

            <MenuDivider />
            {task.parent == null ? (
                <MenuItem
                    text={translate("Attach task")}
                    icon={<Icon icon="git-branch-01" />}
                    disabled={disabled}
                    onClick={onToggleParent}
                />
            ) : (
                <MenuItem
                    icon={<Icon icon="git-merge" />}
                    text={translate("Detach from parent")}
                    onClick={() => TasksActions.alertDetach(task.id)}
                    intent={Intent.WARNING}
                    disabled={disabled}
                />
            )}

            <MenuDivider />

            <MenuItem
                text={`${translate("Privacy")}...`}
                icon={<Icon icon="lock-01" />}
                disabled={disabled}
                onClick={onTogglePrivacy}
            />
            <MenuDivider />

            <MenuItem
                text={translate("Archive task")}
                intent={Intent.WARNING}
                icon={<Icon icon="archive" />}
                onClick={handleArchive}
            />
            <MenuItem
                text={translate("Delete task", { suffix: "..." })}
                intent={Intent.DANGER}
                icon={<Icon icon="trash" />}
                onClick={handleDeleteTask}
            />
        </Menu>
    );
};

const EditTaskDetailsLayout = () => {
    const handleOpenPreferences = () => {
        togglePreferences();
        setTimeout(() => {
            publish("preferences:tab", "projects-tasksdetails");
        }, 200);
    };

    return (
        <div className="task-details-divider">
            <div className="task-details-divider__content">
                <Tooltip content={translate("Edit task details layout")} placement="top-end">
                    <small
                        className={classNames(Classes.TEXT_SMALL, Classes.TEXT_DISABLED)}
                        onClick={handleOpenPreferences}
                        data-testid="edit-task-details-layout"
                    >
                        {translate("Edit")}
                    </small>
                </Tooltip>
            </div>
        </div>
    );
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
