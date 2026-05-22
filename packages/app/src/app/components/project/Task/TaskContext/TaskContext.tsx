// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { taskToggleDoneLabel } from "app/locale/dynamic-messages";
import { Classes, ContextMenu, Intent, Menu, MenuDivider, MenuItem, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
    COPYMOVETYPE,
    FILES_TYPE,
    IAttachment,
    ITag,
    ITask,
    PRIORITY,
    TAGSECTION,
    TAGTYPE,
} from "@stacks/types";
import { Icon } from "app/components/common";
import { PriorityMenu, ProgressMenu, TagsPicker, TintPicker } from "app/components/project";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { useUpload } from "app/hooks/fileUpload";
import { AttachmentsActions, TasksActions } from "app/store/actions";
import { CopyMoveActions } from "app/store/actions/copymove";
import { NavigationStore, cancelSelection } from "app/store/navigation";
import { stripMd } from "app/utils/string";
import { StacksMenu } from "app/widgets";

interface ITaskContextMenuProps {
    task: ITask;
}
export const TaskContextMenu: FunctionComponent<ITaskContextMenuProps> = ({ task }) => {
    const navigate = useNavigate();
    const { tasks } = NavigationStore.get();
    const { pickFiles, removeByRecord } = useUpload({
        allowMultiple: true,
    });

    const isSingle = useMemo(() => {
        return (tasks.length > 1 && !tasks.includes(task.id)) || tasks.length <= 1;
    }, [tasks]);

    const tagCounter = useMemo(
        () =>
            isSingle ? null : (
                <Tag round minimal>
                    {tasks.length}
                </Tag>
            ),
        [isSingle, tasks]
    );

    const openTask = () => {
        navigate(`/task/${task.id}`, {
            state: {
                backgroundLocation: snapshotTaskModalBackground(),
            },
        });
    };

    const handleCopyMove = () => {
        CopyMoveActions.show({
            title: stripMd(task.title),
            type: COPYMOVETYPE.TASK,
            tasks: isSingle ? [task.id] : tasks,
        });
    };

    const handleMarkDone = async (event: React.MouseEvent) => {
        event.preventDefault();
        for (const task of tasks) {
            await TasksActions.setDone(task);
        }
    };

    const handleMarkTodo = async (event: React.MouseEvent) => {
        event.preventDefault();
        for (const task of tasks) {
            await TasksActions.setTodo(task);
        }
    };

    const handleToggleTag = async (tag: ITag, event: React.MouseEvent | React.KeyboardEvent) => {
        const { tasks } = NavigationStore.get();
        if (tasks.length > 0 && tasks.includes(task.id)) {
            event.preventDefault();
            for (const tsk of tasks) {
                await TasksActions.toggleTag(tsk, tag.id);
            }
        } else {
            await TasksActions.toggleTag(task.id, tag.id);
        }
    };

    const handleSetStatus = async (tag: ITag, event: React.MouseEvent | React.KeyboardEvent) => {
        event.preventDefault();
        if (tasks.length > 0 && tasks.includes(task.id)) {
            event.preventDefault();
            for (const tsk of tasks) {
                await TasksActions.setStatus(tsk, tag.id);
            }
        } else {
            TasksActions.setStatus(task.id, task.status === tag.id ? undefined : tag.id);
        }
    };

    const handleSetProgress = async (progress: number, event: React.MouseEvent) => {
        if (isSingle) {
            await TasksActions.setProgress(task.id, progress);
        } else {
            event.preventDefault();

            for (const task of tasks) {
                await TasksActions.setProgress(task, progress);
            }
        }
    };

    const handleSetPriority = async (priority: PRIORITY | null, event: React.MouseEvent) => {
        if (isSingle) {
            await TasksActions.setPriority(task.id, priority);
        } else {
            event.preventDefault();
            for (const task of tasks) {
                await TasksActions.setPriority(task, priority);
            }
        }
    };

    const handleSetTint = async (color: string | undefined) => {
        await TasksActions.setTint(task.id, color);
    };

    const handleArchive = async (event: React.MouseEvent) => {
        if (isSingle) {
            await TasksActions.archiveAlert(task.id);
        } else {
            event.preventDefault();

            for (const task of tasks) {
                await TasksActions.archive(task);
            }

            cancelSelection();
        }
    };

    const handleDeleteTask = async (event: React.MouseEvent) => {
        if (tasks.length > 1 && tasks.includes(task.id)) {
            event.preventDefault();
            await TasksActions.alertDeleteMultiple(tasks);
            NavigationStore.set(state => ({ ...state, tasks: [] }));
        } else {
            await TasksActions.alertDelete(task.id);
        }
    };

    const handleToggleCoverImage = async () => {
        if (task.cover) {
            await removeByRecord(task.id, FILES_TYPE.TASK_COVER);
            await TasksActions.removeCover(task.id);
        } else {
            pickFiles({
                recordId: task.id,
                type: FILES_TYPE.TASK_COVER,
                onUploaded: async (attachments: IAttachment[]) => {
                    const coverImage = attachments.find(
                        attachment => attachment.type === FILES_TYPE.TASK_COVER
                    );
                    if (coverImage && coverImage.thumbnailUrl) {
                        await TasksActions.addCover(task.id, coverImage.thumbnailUrl);
                    }
                },
            });
        }
    };

    const handleQuickMove = async (stackId: string) => {
        if (task.project === "inbox") return;

        if (tasks.length > 1 && tasks.includes(task.id)) {
            for (const taskId of tasks) {
                TasksActions.moveToStack(taskId, stackId, 0);
            }
        } else {
            TasksActions.moveToStack(task.id, stackId, 0);
        }
    };

    const handleAttachFiles = () => {
        pickFiles({
            recordId: task.id,
            type: FILES_TYPE.TASK_ATTACHMENT,
            onUploaded: async (attachments: IAttachment[]) => {
                AttachmentsActions.appendAttachments(task.id, attachments);
            },
        });
    };

    return (
        <Menu>
            {isSingle && (
                <React.Fragment>
                    <MenuItem
                        icon={<Icon icon="edit-05" />}
                        text={translate("Edit task")}
                        onClick={openTask}
                    />
                    <MenuDivider />
                </React.Fragment>
            )}
            {isSingle && (
                <MenuItem
                    icon={<Icon icon={task.done ? "check-circle" : "check-circle-filled"} />}
                    text={taskToggleDoneLabel(task.done)}
                    intent={task.done ? Intent.NONE : Intent.SUCCESS}
                    onClick={() => TasksActions.toggleDone(task.id)}
                />
            )}
            {!isSingle && (
                <React.Fragment>
                    <MenuItem
                        icon="tick-circle"
                        text={translate("Mark selected as done")}
                        intent={Intent.SUCCESS}
                        labelElement={tagCounter}
                        onClick={handleMarkDone}
                    />
                    <MenuItem
                        icon="circle"
                        text={translate("Mark selected as todo")}
                        labelElement={tagCounter}
                        onClick={handleMarkTodo}
                    />
                </React.Fragment>
            )}

            <React.Fragment>
                <MenuDivider />
                <MenuItem
                    icon={<Icon icon="tags" />}
                    text={translate("Tags")}
                    shouldDismissPopover={false}
                    className={Classes.POPOVER_DISMISS}
                >
                    <TagsPicker
                        value={task.tags ? task.tags : []}
                        section={TAGSECTION.PROJECTS}
                        type={TAGTYPE.TAG}
                        contained
                        onToggle={handleToggleTag}
                    />
                </MenuItem>
                <MenuItem
                    icon={<Icon icon="circle" />}
                    text={translate("Status")}
                    shouldDismissPopover={false}
                    className={Classes.POPOVER_DISMISS}
                >
                    <TagsPicker
                        value={task.status ? [task.status] : []}
                        section={TAGSECTION.PROJECTS}
                        contained
                        type={TAGTYPE.STATUS}
                        onToggle={handleSetStatus}
                    />
                </MenuItem>
                <MenuItem
                    icon={<Icon icon="percent-02" />}
                    text={translate("Progress")}
                    shouldDismissPopover={false}
                    className={Classes.POPOVER_DISMISS}
                >
                    <ProgressMenu
                        value={task.progress || 0}
                        onChange={handleSetProgress}
                        menu={false}
                        shouldDismiss={false}
                    />
                </MenuItem>
                <MenuItem
                    icon={<Icon icon="flag" />}
                    text={translate("Priority")}
                    shouldDismissPopover={false}
                    className={Classes.POPOVER_DISMISS}
                    submenuProps={{ style: { padding: 0 } }}
                >
                    <PriorityMenu
                        value={task.priority || PRIORITY.NONE}
                        shouldDismiss={false}
                        onChange={handleSetPriority}
                    />
                </MenuItem>
                <MenuItem
                    icon={<Icon icon="palette" />}
                    text={translate("Tint")}
                    shouldDismissPopover={false}
                    className={Classes.POPOVER_DISMISS}
                >
                    <TintPicker value={task.tint ?? undefined} canClear onChange={handleSetTint} />
                </MenuItem>
            </React.Fragment>

            {isSingle ? (
                <MenuItem
                    icon={<Icon icon={task.cover ? "image-x" : "image-plus"} />}
                    text={translate(task.cover ? "Remove cover" : "Add cover")}
                    intent={task.cover ? Intent.WARNING : Intent.NONE}
                    onClick={handleToggleCoverImage}
                />
            ) : null}

            {isSingle ? (
                <MenuItem
                    icon={<Icon icon="file-plus-02" />}
                    text={translate("Add attachments")}
                    onClick={handleAttachFiles}
                />
            ) : null}
            {task.project !== "inbox" ? (
                <>
                    <MenuDivider />
                    <MenuItem
                        icon={<Icon icon="clipboard" />}
                        text={translate("Copy or Move")}
                        labelElement={tagCounter}
                        className={Classes.POPOVER_DISMISS}
                        onClick={handleCopyMove}
                    />

                    <MenuItem
                        icon={<Icon icon="switch-horizontal-01" />}
                        text={translate("Quick move to")}
                        labelElement={tagCounter}
                        submenuProps={{ style: { padding: 0 } }}
                        popoverProps={{ lazy: true }}
                    >
                        <StacksMenuItem task={task} onMove={handleQuickMove} />
                    </MenuItem>
                </>
            ) : null}

            {isSingle && (
                <>
                    <MenuDivider />
                    <MenuItem
                        text={`${translate("Privacy")}...`}
                        icon={<Icon icon="lock-01" />}
                        onClick={() => TasksActions.togglePrivacy(task.id)}
                    />
                </>
            )}

            <MenuDivider />
            <MenuItem
                icon={<Icon icon="archive" />}
                className={Classes.POPOVER_DISMISS}
                text={translate(isSingle ? "Archive task" : "Archive selected tasks")}
                onClick={handleArchive}
                labelElement={tagCounter}
                intent={Intent.WARNING}
            />
            <MenuItem
                icon={<Icon icon="trash" />}
                text={translate(isSingle ? "Delete task" : "Delete selected tasks")}
                intent={Intent.DANGER}
                labelElement={tagCounter}
                onClick={handleDeleteTask}
                shouldDismissPopover={true}
            />
        </Menu>
    );
};

interface StacksMenuItemProps {
    task: ITask;
    onMove: (stackId: string) => void;
}
const StacksMenuItem: FunctionComponent<StacksMenuItemProps> = ({ task, onMove }) => {
    return <StacksMenu projectId={task.project} selected={task.stack} showAdd onClick={onMove} />;
};

interface ITaskContextProps {
    task: ITask;
    children?: React.ReactNode;
}
export const TaskContext: FunctionComponent<ITaskContextProps> = ({ task, children }) => {
    return (
        <React.Fragment>
            <ContextMenu content={<TaskContextMenu task={task} />}>{children}</ContextMenu>
        </React.Fragment>
    );
};
