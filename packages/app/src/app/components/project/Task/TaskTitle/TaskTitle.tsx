// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { Classes, TextArea, Keys } from "@blueprintjs/core";
import { TributeItem } from "tributejs";
import classNames from "classnames";

import { IAutocompleteSelectedItem, useAutocomplete } from "app/hooks/autocomplete";
import { ITag, ITask, PRIORITY } from "@stacks/types";
import { TaskState } from "../TaskState/TaskState";
import { Col, Grid, Row } from "app/components/common";
import { timeSince } from "app/utils/date";

interface ITaskTitleProps {
    task: ITask;
    disabled?: boolean;
    onChange: (value: string) => void;
    onToggleAssignee: (assigneeId: string) => void;
    onToggleTag: (tagid: string) => void;
    onSetStatus: (statusId: string) => void;
    onSetPriority: (priority: PRIORITY) => void;
}
export const TaskTitle: FunctionComponent<ITaskTitleProps> = ({
    task,
    disabled,
    onChange,
    onToggleAssignee,
    onToggleTag,
    onSetStatus,
    onSetPriority,
}) => {
    const [title, setTitle] = useState(task.title);
    const [isEditing, setIsEditing] = useState(false);
    const titleRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const { show, hide, onSelect } = useAutocomplete({
        tags: true,
        assignees: true,
        emojis: true,
        documents: true,
        priority: true,
        statuses: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documentsSelectTemplate: (item: TributeItem<any>) => {
            return `[${item.original.key}](${item.original.value})`;
        },
    });

    useEffect(() => {
        if (task.title !== title) {
            setTitle(task.title);
        }
    }, [task.title]);

    useEffect(() => {
        if (inputRef.current) {
            show(inputRef.current);
        } else if (titleRef.current) {
            titleRef.current.tabIndex = 0;
            titleRef.current.focus();
        }
    }, [isEditing]);

    onSelect((selectedItem: IAutocompleteSelectedItem<ITag | string | PRIORITY>) => {
        if (inputRef.current) {
            inputRef.current.value = inputRef.current.value.replace(` ${selectedItem.key}`, "");
            if (selectedItem.type === "assignee") {
                onToggleAssignee(selectedItem.item as string);
            } else if (selectedItem.type === "tag") {
                onToggleTag((selectedItem.item as ITag).id);
            } else if (selectedItem.type === "status") {
                onSetStatus((selectedItem.item as ITag).id);
            } else if (selectedItem.type === "priority") {
                onSetPriority(selectedItem.item as PRIORITY);
            }
        }
    });

    const handleCancel = () => {
        if (inputRef.current) {
            hide(inputRef.current);
        }
        setIsEditing(false);
    };

    const handleChange = (title: string) => {
        handleCancel();
        onChange(title || translate("Untitled task"));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.which === Keys.ESCAPE) {
            event.stopPropagation();
        }

        if ((event.which === Keys.ENTER && !event.shiftKey) || event.which === Keys.ESCAPE) {
            event.preventDefault();
            handleBlur();
        }
    };

    const handleBlur = () => {
        if (inputRef.current) {
            handleChange(inputRef.current.value);
            inputRef.current.blur();
        }
    };

    const handleEditing = () => {
        if (disabled) return;
        setIsEditing(true);
    };

    return (
        <Row gutter={8} className="task-details-title" data-testid="task-details-title">
            <Col width="auto">
                <div style={{ marginTop: 3 }}>
                    <TaskState id="td-state" taskId={task.id} large />
                </div>
            </Col>
            <Col fill className="task-edit-title">
                <Grid gap={5}>
                    <div
                        className={classNames(Classes.EDITABLE_TEXT, Classes.MULTILINE, {
                            [Classes.EDITABLE_TEXT_EDITING]: isEditing,
                        })}
                    >
                        <TextArea
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className={Classes.EDITABLE_TEXT_INPUT}
                            autoResize
                            fill
                            inputRef={inputRef}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            onFocus={handleEditing}
                            onBlur={handleBlur}
                            // disabled={disabled}
                            readOnly={disabled}
                            placeholder="Edit task title"
                        />
                    </div>

                    <small className={Classes.TEXT_DISABLED}>
                        {task.archived && (
                            <>
                                {translate("Archived on")}{" "}
                                <strong>{timeSince(task.archived)}</strong>,{" "}
                            </>
                        )}
                        {!task.archived && (
                            <>
                                {translate("Created on")}{" "}
                                <strong>{timeSince(task?.created)}</strong>,{" "}
                            </>
                        )}
                        {translate("last updated on")}{" "}
                        <strong>{timeSince(task?.updated)}</strong>
                        {task.done && task.completed != null ? (
                            <>
                                {", "}
                                {translate("completed on")}{" "}
                                <strong>{timeSince(task.completed)}</strong>
                            </>
                        ) : null}
                    </small>
                </Grid>
            </Col>
        </Row>
    );
};
