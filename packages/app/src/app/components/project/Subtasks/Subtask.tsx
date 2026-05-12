// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Intent, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ITask } from "@stacks/types";
import {
    DateRangePickerButton,
    Icon,
    RoundButton,
    Textarea,
    TextareaHandle
} from "app/components/common";
import { getTaskModalListBackgroundFromHistory } from "app/hooks/router";
import { TasksActions } from "app/store/actions";
import { PreferencesStore } from "app/store/preferences";
import { TaskAssignees } from "app/widgets";
import { SubtasksCountButton, TaskState } from "../Task";
import { Draggable } from "app/components/draggable";

interface ISubtaskProps {
    subtask: ITask;
    disabled?: boolean;
    subtasksContainerId: string;
}
export const Subtask: FunctionComponent<ISubtaskProps> = ({ subtask, disabled, subtasksContainerId }) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<TextareaHandle>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (inputRef.current?.input) {
            inputRef.current.focus();
        }
    }, [editing]);

    const startDate = subtask.startdate;
    const dueDate = subtask.duedate;

    const handleEdit = () => {
        setEditing(true);
    };

    const handleOpenSubtask = (subtaskId: string, projectId: string, scroll?: boolean, click?: boolean) => {
        if (PreferencesStore.get().embeddedTask) {
            if (projectId === "inbox") {
                navigate(`/inbox/${subtaskId}`);
            } else {
                navigate(`/project/${projectId}/${subtaskId}`);
            }
        } else {
            const backgroundLocation = getTaskModalListBackgroundFromHistory();
            if (backgroundLocation) {
                navigate(`/task/${subtaskId}`, {
                    state: { backgroundLocation },
                });
            }
        }

        if (scroll) {
            setTimeout(() => {
                document.getElementById("subtasks")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);
        } else if (click) {
            setTimeout(() => {
                document
                    .getElementById("new-subtask-button")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                document.getElementById("new-subtask-button")?.click();
            }, 200);
        }
    };

    const handleToggleEdit = (event: React.MouseEvent) => {
        if (disabled) return;
        if (event.ctrlKey || event.metaKey) {
            handleEdit();
        } else {
            event.stopPropagation();

            handleOpenSubtask(subtask.id, subtask.project);
        }
    };

    const handleSave = (title: string) => {
        if (title.length > 0 && title !== subtask.title) {
            TasksActions.setTitle(subtask.id, title);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();

            if (inputRef.current?.input) {
                handleSave(inputRef.current.input.value.trim());
            }
            setEditing(false);
        } else if (e.key === "Escape") {
            e.stopPropagation();
            setEditing(false);
        }
    };

    const handleBlur = () => {
        if (inputRef.current?.input) {
            handleSave(inputRef.current.input.value.trim());
        }
        setEditing(false);
    };

    const handleDatesChange = (sDate: Date | null, dDate: Date | null) => {
        TasksActions.setDates(
            subtask.id,
            sDate,
            dDate
        );
    };

    const handleToggleAssignees = (personId: string) => {
        TasksActions.toggleAssignee(subtask.id, personId);
    };

    const handleDeleteSubtask = () => {
        TasksActions.alertDelete(subtask.id);
    };

    const handleDetachSubtask = () => {
        TasksActions.alertDetach(subtask.id);
    };

    const handleAddNewSubtask = () => {
        handleOpenSubtask(subtask.id, subtask.project, false, true);
    };

    const handleShowSubtasks = () => {
        handleOpenSubtask(subtask.id, subtask.project, true);
    };

    return (
        <Draggable
            id={subtask.id}
            type="subtask"
            containerId={subtasksContainerId}
            handleClassName="subtask-drag-handle"
            className="subtask"
            data-testid="subtask-item"
        >
            <div
                className={classNames("subtask-wrapper", {
                    complete: subtask.done,
                })}
            >
                {disabled ? null : (
                    <div className="subtask-drag-handle" data-testid="subtask-drag-handle">
                        <Icon icon="drag" size={18} />
                    </div>
                )}

                <TaskState taskId={subtask.id} disabled={disabled} testId="subtask-state" />

                <div className="subtask-title">
                    {editing && (
                        <Textarea
                            defaultValue={subtask.title}
                            ref={inputRef}
                            autoCorrect="false"
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                            data-testid="subtask-title-input"
                        />
                    )}
                    {!editing && (
                        <div className="subtask-content" onClick={handleToggleEdit} data-testid="subtask-title">
                            {subtask.title}
                        </div>
                    )}

                    <SubtasksCountButton taskId={subtask.id} onClick={handleShowSubtasks} />
                </div>

                <DateRangePickerButton
                    start={startDate ?? null}
                    end={dueDate ?? null}
                    onChange={handleDatesChange}
                    className={classNames({ hiddable: startDate == null && dueDate == null })}
                    disabled={disabled}
                    minimal
                    testId="subtask-dates-picker-button"
                />

                <TaskAssignees
                    assignees={subtask.assignees || []}
                    max={1}
                    showEmpty
                    minimal
                    disabled={disabled}
                    className={classNames({ hiddable: !subtask.assignees?.length })}
                    onToggle={handleToggleAssignees}
                    onClear={() => TasksActions.setAssignees(subtask.id, [])}
                />

                {disabled ? null : (
                    <SubtaskMenu
                        onOpen={handleToggleEdit}
                        onEdit={handleEdit}
                        onAdd={handleAddNewSubtask}
                        onDelete={handleDeleteSubtask}
                        onDetach={handleDetachSubtask}
                    />
                )}
            </div>
        </Draggable>
    );
};

interface SubtaskMenuProps {
    onEdit: (event: React.MouseEvent) => void;
    onOpen: (event: React.MouseEvent) => void;
    onDelete: (event: React.MouseEvent) => void;
    onAdd: (event: React.MouseEvent) => void;
    onDetach: (event: React.MouseEvent) => void;
}
const SubtaskMenu: FunctionComponent<SubtaskMenuProps> = ({ onEdit, onOpen, onDelete, onAdd, onDetach }) => {
    return (
        <Popover
            content={
                <Menu>
                    <MenuItem
                        icon={<Icon icon="edit-05" />}
                        text={translate("Edit task")}
                        onClick={onOpen}
                    />
                    <MenuItem
                        icon={<Icon icon="edit-04" />}
                        text={`${translate("Edit inline")}...`}
                        onClick={onEdit}
                    />
                    <MenuItem
                        icon={<Icon icon="edit-04" />}
                        text={translate("Add subtask here")}
                        onClick={onAdd}
                    />
                    <MenuDivider />
                    <MenuItem
                        icon={<Icon icon="git-merge" />}
                        text={translate("Detach from parent")}
                        onClick={onDetach}
                        intent={Intent.WARNING}
                    />
                    <MenuDivider />
                    <MenuItem
                        text={`${translate("Delete task")}...`}
                        intent={Intent.DANGER}
                        icon={<Icon icon="trash" />}
                        onClick={onDelete}
                    />
                </Menu>
            }
            className="hiddable"
            placement="bottom-end"
        >
            <RoundButton dashed icon="dots-vertical" />
        </Popover>
    );
};
