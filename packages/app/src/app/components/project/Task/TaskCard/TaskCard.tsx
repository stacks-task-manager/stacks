// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Collapse, Colors, Popover, Tooltip } from "@blueprintjs/core";
import { default as classNames, default as classnames } from "classnames";
import noop from "lodash/noop";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import { DropEvent, FileWithPath, useDropzone } from "react-dropzone";
import { IReminder, IRepeats, ITask, PRIORITY, TAGSECTION, TAGTYPE } from "@stacks/types";
import { Draggable } from "app/components/draggable";
import { ClickStop, Col, DropZone, Grid, Icon, LazyLoad, RoundButton, Row } from "app/components/common";
import {
    PopupLatestComments,
    PriorityPicker,
    ProgressPicker,
    RepeatsTooltipContent,
    SubtasksCountButton,
    TaskCover,
    TaskState,
} from "app/components/project";
import { useNav, usePreferences, useSubscribe, useSubtasks, useTask, useTaskNavigation } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { TasksActions } from "app/store/actions";
import { NavigationStore, setSelection } from "app/store/navigation";
import { PreferencesStore } from "app/store/preferences";
import { colorToRGBA } from "app/utils/colors";
import { scrollIntoView } from "app/utils/dom";
import { stripHTML, truncateEnd } from "app/utils/string";

/** Survives TaskCard remounts (e.g. after DnD list reconciliation). */
const taskCardSubtasksExpanded = new Map<string, boolean>();
import {
    CircularProgress,
    HTMLRenderer,
    ReminderButton,
    Tags,
    TagsPickerPopupSync,
    TagsWrapper,
    TaskAssignees,
    TaskContextButton,
    TaskDate,
    TaskItems,
    TaskStatus,
    TaskStatusBar,
} from "app/widgets";

interface DraggableTaskCardProps extends React.HTMLProps<HTMLDivElement> {
    children: React.ReactNode;
    taskId: string;
    stackId?: string;
    containerId?: string;
    /** Must match parent Container `type` (e.g. board-task vs timebox-task). */
    dragType?: string;
    isDraggable?: boolean;
    done?: boolean;
}
const DraggableTaskCard: FunctionComponent<DraggableTaskCardProps> = props => {
    const {
        isDraggable,
        taskId,
        stackId,
        containerId,
        dragType = "board-task",
        done,
        children,
        ...restProps
    } = props;
    const { as: _omitAsFromDraggable, ...restForDraggable } = restProps;

    const dragContainerId = containerId ?? (stackId ? `stack-column-${stackId}` : undefined);

    if (!isDraggable || !dragContainerId) {
        return (
            <div
                className={classNames("td-keep task-card-outer", {
                    draggable: restProps.draggable === "true",
                    done,
                })}
                data-testid="task-card"
                {...restProps}
            >
                {children}
            </div>
        );
    }

    return (
        <Draggable
            id={taskId}
            type={dragType}
            containerId={dragContainerId}
            className={classNames("td-keep task-card-outer", { done })}
            data-testid="task-card"
            {...restForDraggable}
        >
            {children}
        </Draggable>
    );
};

interface ITaskCardProps {
    taskId: string;
    stackId?: string;
    /** When set, used as the drag-drop container id (e.g. timebox day column). Falls back to stack-column-{stackId}. */
    containerId?: string;
    /** Drag type; must match parent Container. Defaults to board-task. Use timebox-task on the timebox board. */
    dragType?: string;
    initialVisible: boolean;
    disabled?: boolean;
}

interface TaskCardComponentProps extends ITaskCardProps, React.HTMLProps<HTMLDivElement> {
    task: ITask;
    isDraggable?: boolean;
}

export const TaskCardComponent: FunctionComponent<TaskCardComponentProps> = props => {
    const {
        task,
        taskId,
        stackId,
        containerId,
        dragType,
        initialVisible,
        disabled,
        isDraggable,
        ...restProps
    } = props;
    const { fixedCoverHeight } = usePreferences(["fixedCoverHeight"]);
    const isComplete = task.done;
    const navigate = useNav();
    const selected = useTaskNavigation(taskId);
    const [isSubtasksVisible, setIsSubtasksVisible] = useState(
        () => taskCardSubtasksExpanded.get(taskId) ?? false
    );

    const setSubtasksVisible = useCallback((visible: boolean) => {
        taskCardSubtasksExpanded.set(taskId, visible);
        setIsSubtasksVisible(visible);
    }, [taskId]);

    const onDrop = useCallback(async (_acceptedFiles: FileWithPath[]) => {
        // Drop-to-attach is wired up in TaskDetails. The card-level drop handler is
        // a no-op until file-on-card uploads are implemented.
    }, []);

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
        getFilesFromEvent,
    });

    const openTask = (taskId: string) => {
        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${task.project}/${taskId}`);
            setTimeout(() => {
                scrollIntoView(document.getElementById(`task-${taskId}`), { behavior: "smooth" });
            }, 500);
        } else {
            navigate(`/task/${taskId}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    const handleOpenTask = (event: React.MouseEvent) => {
        if (disabled) return;
        event.stopPropagation();

        const { highlightTask, highlightStack, clickSelectTask } = PreferencesStore.get();

        if (event.metaKey || event.ctrlKey || (highlightTask && clickSelectTask)) {
            setSelection(highlightStack && stackId ? stackId : "", task.id, event.metaKey || event.ctrlKey);
        }

        if (event.metaKey || event.ctrlKey) {
            return;
        }

        openTask(task.id);
    };

    return (
        <DraggableTaskCard
            taskId={taskId}
            stackId={stackId}
            containerId={containerId}
            dragType={dragType}
            isDraggable={isDraggable}
            done={task.done}
            {...restProps}
        >
            <div id={`task-${task.id}`} className="task-scroll-anchor" />
            <SelectionCounter task={taskId} />

            <LazyLoad
                stayRendered
                threshold={0.2}
                defaultHeight={100}
                initialVisible={initialVisible}
                loadingElement={<div style={{ height: 100 }} className={Classes.SKELETON} />}
                className={classnames("task-card", {
                    selected,
                    tinted: task.tint != null,
                    hasCover: task.cover,
                })}
                style={{
                    ["--task-tint" as string]: task.tint,
                    ["--task-tint-rgb" as string]: task.tint && colorToRGBA(task.tint, 5),
                }}
                onClick={handleOpenTask}
            >
                <div
                    className={classnames("task-card-inner-wrapper", [Classes.POPOVER_DISMISS], {
                        hasStatus: task.status != null,
                    })}
                    {...getRootProps()}
                    onFocus={noop}
                    onBlur={noop}
                    data-testid="task-card-inner-wrapper"
                >
                    {isDragActive ? <DropZone narrow /> : null}
                    {disabled || isComplete ? null : <TaskContextButton stackId={stackId} task={task} />}
                    <TaskStatusBar
                        value={task.status}
                        taskId={taskId}
                        variant="card"
                        disabled={disabled || isComplete}
                    />

                    {task.cover && <TaskCover url={task.cover} fixed={fixedCoverHeight} />}

                    <div className="task-card-content">
                        <Grid gap={13}>
                            <div className="task-card-title-wrapper">
                                <div className="task-card-title" data-testid="task-card-title">
                                    {truncateEnd(task.title, 200)}
                                </div>
                                <span onClick={event => event.stopPropagation()} className="task-card-state">
                                    <TaskState taskId={taskId} />
                                </span>
                            </div>

                            <ActiveTags taskId={task.id} tags={task.tags} disabled={disabled || isComplete} />
                            <TaskMidSection task={task} disabled={disabled || isComplete} />

                            <TaskFooter
                                task={task}
                                disabled={disabled || isComplete}
                                isSubtasksVisible={isSubtasksVisible}
                                onToggleSubtaskVisibility={setSubtasksVisible}
                            />
                        </Grid>
                    </div>

                    <ClickStop className="task-card-footer">
                        <Collapse isOpen={isSubtasksVisible}>
                            <TaskSubtasks parentId={taskId} />
                        </Collapse>
                    </ClickStop>
                </div>
            </LazyLoad>
        </DraggableTaskCard>
    );
};

const TaskSubtasks = ({ parentId }: { parentId: string }) => {
    const { subtasks } = useSubtasks(parentId, false);
    return <TaskItems parentId={parentId} tasks={subtasks} max={10} />;
};

const TaskFooter = ({
    task,
    disabled,
    isSubtasksVisible,
    onToggleSubtaskVisibility,
}: {
    task: ITask;
    disabled?: boolean;
    isSubtasksVisible: boolean;
    onToggleSubtaskVisibility: (visible: boolean) => void;
}) => {
    const { showAssignees, showDates, showComments, showSubtasks } = usePreferences([
        "showAssignees",
        "showDates",
        "showComments",
        "showSubtasks",
    ]);
    const { subtasks } = useSubtasks(task.id, false);
    const commentsCount = task.comments;

    const showLeft = showAssignees || showDates;
    const showRight = showComments || showSubtasks;

    let shouldShowFooter = showLeft;

    if (showRight && (commentsCount > 0 || subtasks.length)) {
        shouldShowFooter = true;
    }

    const privacyButton = useMemo(() => {
        if (task.permissions.isPublic) return null;
        return (
            <Tooltip content={translate("This task is private")} placement="bottom-end">
                <ClickStop>
                    <button className="task-card-button" onClick={() => TasksActions.togglePrivacy(task.id)}>
                        <Icon icon="shield-tick" color={Colors.RED3} />
                    </button>
                </ClickStop>
            </Tooltip>
        );
    }, [task.permissions.isPublic]);

    if (!shouldShowFooter) return null;

    const handleToggleSubtaskVisibility = () => {
        onToggleSubtaskVisibility(!isSubtasksVisible);
    };

    return (
        <Row>
            <Col gap={8}>
                {showAssignees ? (
                    <ClickStop>
                        <TaskAssignees
                            taskId={task.id}
                            assignees={task.assignees || []}
                            showEmpty
                            minimal
                            max={1}
                            disabled={disabled}
                        />
                    </ClickStop>
                ) : null}

                {showDates ? (
                    <ClickStop>
                        <TaskDate
                            taskId={task.id}
                            duedate={task.duedate}
                            startdate={task.startdate}
                            done={task.done}
                            disabled={disabled}
                        />
                    </ClickStop>
                ) : null}

                {privacyButton}
            </Col>
            <Col justify="right" gap={10}>
                {showComments ? <TaskCommentsCount taskId={task.id} count={commentsCount} /> : null}
                {showSubtasks ? (
                    <SubtasksCountButton
                        taskId={task.id}
                        isVisible={isSubtasksVisible}
                        onClick={handleToggleSubtaskVisibility}
                    />
                ) : null}
            </Col>
        </Row>
    );
};

const TaskCommentsCount = ({ taskId, count }: { taskId: string; count: number }) => {
    if (!count) return null;
    return (
        <ClickStop>
            <PopupLatestComments taskId={taskId}>
                <button className="task-card-button">
                    {count}
                    <Icon icon="message-chat-square" size={12} />
                </button>
            </PopupLatestComments>
        </ClickStop>
    );
};

interface IActiveTagsProps {
    taskId: string;
    tags?: string[];
    disabled?: boolean;
}
const ActiveTags: FunctionComponent<IActiveTagsProps> = ({ taskId, tags, disabled }) => {
    if (!Boolean(tags?.length)) return null;

    const handleSetTags = (tags: string[]) => {
        TasksActions.setTags(taskId, tags);
    };

    return (
        <TagsWrapper>
            {!disabled ? (
                <TagsPickerPopupSync
                    value={tags || []}
                    type={TAGTYPE.TAG}
                    section={TAGSECTION.PROJECTS}
                    onToggle={handleSetTags}
                >
                    <RoundButton dashed small tooltip={translate("Add tags")} />
                </TagsPickerPopupSync>
            ) : null}
            <Tags value={tags ?? []} section={TAGSECTION.PROJECTS} max={5} ellipsize />
        </TagsWrapper>
    );
};

const TaskMidSection = ({ task, disabled }: { task: ITask; disabled?: boolean }) => {
    const {
        showPriority,
        showProgress,
        showRepeats,
        showNotifications,
        showExtendedStatus,
        showDescription,
    } = usePreferences([
        "showPriority",
        "showProgress",
        "showRepeats",
        "showNotifications",
        "showExtendedStatus",
        "showDescription",
    ]);
    const [availableReminders, setAvailableReminders] = useState<Date[]>(
        (task.reminders ?? []).map(r => new Date(r))
    );

    useEffect(() => {
        if (task.reminders) {
            setAvailableReminders(task.reminders.map(n => new Date(n)));
        }
    }, [task.reminders]);

    useSubscribe("task:reminder:changed", (event: { taskId: string; reminders: IReminder[] }) => {
        if (event.taskId !== task.id) return;
        setAvailableReminders(event.reminders.map(n => n.date));
    });

    const hasStatus = task.status != null;
    const hasPriority = task.priority != null && task.priority !== PRIORITY.NONE;
    const hasProgress = task.progress != null && task.progress > 0;
    const hasReminders = availableReminders.length > 0;
    const hasDescription = task.description && stripHTML(task.description).length > 0;

    const shouldShowMidSection =
        (showPriority && hasPriority) ||
        (showProgress && hasProgress) ||
        (showRepeats && task.repeats) ||
        (showNotifications && hasReminders) ||
        (hasStatus && showExtendedStatus) ||
        (hasDescription && showDescription);

    if (!shouldShowMidSection) return null;

    return (
        <TagsWrapper>
            {hasStatus && showExtendedStatus ? (
                <ClickStop>
                    <TaskStatus taskId={task.id} value={task.status} minimal disabled={disabled} />
                </ClickStop>
            ) : null}

            {showProgress && hasProgress ? (
                <TaskProgress taskId={task.id} progress={task.progress} disabled={disabled} />
            ) : null}

            {hasPriority && showPriority ? (
                <TaskPriority taskId={task.id} priority={task.priority} disabled={disabled} />
            ) : null}

            {showNotifications && hasReminders ? (
                <TaskCardNotifications notifications={availableReminders} />
            ) : null}

            {showRepeats && task.repeats ? <TaskRepeat repeats={task.repeats} disabled={disabled} /> : null}

            {hasDescription && showDescription ? <TaskDescription description={task.description} /> : null}
        </TagsWrapper>
    );
};

const TaskProgress = ({
    taskId,
    progress,
    disabled,
}: {
    taskId: string;
    progress?: number;
    disabled?: boolean;
}) => {
    return (
        <ClickStop>
            <ProgressPicker
                value={progress || 0}
                disabled={disabled}
                onChange={progress => TasksActions.setProgress(taskId, progress)}
            >
                <Tooltip
                    content={`This task is at ${progress || 0}%`}
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props}>
                            <CircularProgress progress={progress || 0} />
                        </span>
                    )}
                />
            </ProgressPicker>
        </ClickStop>
    );
};

const TaskPriority = ({
    taskId,
    priority,
    disabled,
}: {
    taskId: string;
    priority: PRIORITY | null;
    disabled?: boolean;
}) => {
    const { showExtendedPriority } = usePreferences(["showExtendedPriority"]);

    const hasPriority = priority != null && priority !== PRIORITY.NONE;
    if (!hasPriority) return null;

    return (
        <ClickStop>
            <PriorityPicker
                value={priority}
                taskId={taskId}
                minimal
                short={!showExtendedPriority}
                tooltip={translate("Add priority")}
                disabled={disabled}
            />
        </ClickStop>
    );
};

const TaskRepeat = ({ repeats, disabled }: { repeats?: IRepeats; disabled?: boolean }) => {
    const repeatsTooltip = useMemo(() => {
        return RepeatsTooltipContent(repeats);
    }, [repeats]);

    return (
        <Tooltip content={repeatsTooltip} placement="top">
            <RoundButton disabled={disabled} icon="refresh-ccw" />
        </Tooltip>
    );
};

const TaskCardNotifications = ({ notifications }: { notifications: Date[] }) => {
    return (
        <ClickStop>
            <ReminderButton placement="bottom" tooltipPlacement="bottom" reminders={notifications} />
        </ClickStop>
    );
};

const TaskDescription = ({ description }: { description: string }) => {
    return (
        <ClickStop>
            <Popover
                content={<HTMLRenderer html={description} breakWord />}
                popoverClassName="popover-padded-medium popover-medium"
            >
                <Tooltip content="This task has a description" placement="top">
                    <RoundButton icon="notification-text" />
                </Tooltip>
            </Popover>
        </ClickStop>
    );
};

interface ISelectionCounterProps {
    task: string;
}
const SelectionCounter: FunctionComponent<ISelectionCounterProps> = ({ task }) => {
    const { tasks } = NavigationStore.use();
    if (tasks.length <= 1 || !tasks.includes(task)) return null;

    return (
        <>
            <div className="task-selection-shadows">
                <div className="task-selection-shadow-1" />
                <div className="task-selection-shadow-2" />
            </div>
            <div className="task-selection-count">{tasks.length}</div>
        </>
    );
};

const TaskCardPure: FunctionComponent<ITaskCardProps> = props => {
    const { task } = useTask(props.taskId);
    if (!task) return null;
    return <TaskCardComponent {...props} task={task} isDraggable />;
};

export const TaskCard = React.memo(TaskCardPure);
