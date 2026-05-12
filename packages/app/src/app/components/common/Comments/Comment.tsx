// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Intent, Menu, MenuItem, Popover, Tag } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useMemo, useState } from "react";

import {
    ACTIVITYTYPE,
    FILES_TYPE,
    IActivity,
    IActivityChange,
    IComment,
    PRIORITY,
    TAGSECTION,
} from "@stacks/types";
import { Avatar, Col, DateChip, Grid, Icon, Row } from "app/components/common";
import { PriorityChip, TIRepeats } from "app/components/project";
import { getPeople, getStack, getTag } from "app/hooks";
import { ActivitiesActions, FilesActions } from "app/store/actions";
import { formatDuration, timeSince } from "app/utils/date";
import { Assignees, Editor, HTMLRenderer, StatusChip, Tags, TipTapEditorContent } from "app/widgets";
interface ICommentProps {
    resourceId: string;
    comment: IComment;
    mine: boolean;
}

export const Comment: FunctionComponent<ICommentProps> = ({ resourceId, comment, mine }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState(comment.content);
    const [canSave, setCanSave] = useState(true);

    const handleToggleEdit = () => {
        if (isEditing) {
            setMessage(comment.content);
        }
        setIsEditing(!isEditing);
    };

    const handleUpdate = () => {
        ActivitiesActions.update(resourceId, comment.id, message);
        setIsEditing(false);
    };

    const handleDelete = async () => {
        ActivitiesActions.removeAlert(resourceId, comment.id);
        await FilesActions.removeByRecord(resourceId, FILES_TYPE.TASK_COMMENT);
    };

    const handleChangeMessage = ({ html, string }: TipTapEditorContent) => {
        setMessage(html);
        setCanSave(string.trim().length > 0);
    };

    if (comment.type === ACTIVITYTYPE.LOG) {
        return (
            <div className={classNames("comment", comment.type)}>
                <div>
                    {comment.assignee && (
                        <span style={{ fontWeight: "600" }}>
                            {comment.assignee.firstName} {comment.assignee.lastName}
                        </span>
                    )}{" "}
                    <ActivityLogRenderer activity={comment} />
                </div>

                <div className="comment-timestamp">
                    {comment.updated != null ? timeSince(comment.updated) : timeSince(comment.created)}
                </div>
            </div>
        );
    }

    return (
        <div className={classNames("comment", comment.type, mine ? "from-me" : "from-them")}>
            {comment.assignee && <Avatar person={comment.assignee} />}

            <div className="comment-content">
                <div className="comment-header">
                    <div className="comment-person">
                        {comment.assignee && `${comment.assignee.firstName} ${comment.assignee.lastName}`}

                        <div className="comment-timestamp">
                            {comment.updated != null ? (
                                <>
                                    {translate("Updated on")} {timeSince(comment.updated)}
                                </>
                            ) : (
                                <>
                                    {translate("Created on")} {timeSince(comment.created)}
                                </>
                            )}
                        </div>
                    </div>

                    {mine && !isEditing ? (
                        <Popover
                            content={
                                <Menu>
                                    <MenuItem
                                        text="Edit comment"
                                        icon={<Icon icon="edit-05" />}
                                        onClick={handleToggleEdit}
                                    />
                                    <MenuItem
                                        text="Delete comment"
                                        icon={<Icon icon="trash" />}
                                        intent={Intent.DANGER}
                                        onClick={handleDelete}
                                    />
                                </Menu>
                            }
                            className="comment-context-button"
                            placement="bottom-end"
                        >
                            <Button variant="minimal" size="small" icon={<Icon icon="dots-vertical" />} />
                        </Popover>
                    ) : null}
                </div>
                <div className="comment-message">
                    {comment.type === ACTIVITYTYPE.MESSAGE && !isEditing ? (
                        <HTMLRenderer html={comment.content} />
                    ) : null}
                    {comment.type === ACTIVITYTYPE.MESSAGE && isEditing ? (
                        <Grid>
                            <Editor
                                onUpdate={handleChangeMessage}
                                value={message}
                                placeholder="Add a comment"
                                editing
                            />
                            <Row>
                                <Col justify="right" gap={10}>
                                    <Button onClick={handleToggleEdit}>{translate("Cancel")}</Button>
                                    <Button
                                        intent={Intent.PRIMARY}
                                        onClick={handleUpdate}
                                        disabled={!canSave}
                                    >
                                        {translate("Update")}
                                    </Button>
                                </Col>
                            </Row>
                        </Grid>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ActivityParser = ({ field, value }: { field: string; value: any }) => {
    if (field === "priority") {
        return <PriorityChip priority={value as PRIORITY} />;
    } else if (field === "status") {
        const status = getTag(value);
        return status ? <StatusChip tag={status} /> : <>-</>;
    } else if (field === "assignees") {
        const people = getPeople(value);
        return <Assignees assignees={people} small />;
    } else if (["startdate", "duedate", "dodate", "completed"].includes(field)) {
        if (!value) {
            return <Tag minimal>None</Tag>;
        }
        return <DateChip startDate={value} extendedFormat disabled icon={false} />;
    } else if (field === "progress") {
        return (
            <Tag minimal round>
                {value}%
            </Tag>
        );
    } else if (field === "tags") {
        return value.length ? (
            <Tags value={value} section={TAGSECTION.PROJECTS} />
        ) : (
            <Tag minimal round>
                None
            </Tag>
        );
    } else if (field === "estimate") {
        return (
            <Tag minimal intent={Intent.SUCCESS}>
                {formatDuration(value)}
            </Tag>
        );
    } else if (field === "repeats") {
        return <TIRepeats taskId={""} value={value} disabled />;
    } else if (field === "tint") {
        return <Icon icon="stop-filled" color={value} />;
    } else if (field === "stack") {
        return <Tag minimal>{getStack(value)?.title}</Tag>;
    } else if (field === "timeSpent") {
        return <>{value}</>;
    }

    return null;
};

const fieldsTranslation: { [key: string]: string } = {
    completed: "completed date",
};

const ActivityLogRenderer = ({ activity }: { activity: IActivity }) => {
    const { change } = activity;
    const fieldsWithoutBefore = ["title"];

    const label = useMemo(() => {
        if (!change) {
            return "";
        }
        const { field, before, after } = change;
        if (field === "description") {
            return "changed the {field}";
        }

        if (field === "done") {
            if (!before && after) {
                return "completed the task";
            } else if (before && !after) {
                return "marked the task as to do";
            }
        }

        if (field === "cover") {
            if (!before && after) {
                return "added a cover image";
            } else if (before && !after) {
                return "remove the cover image";
            }
        }

        if (field === "position") {
            return "moved the task from: {before} to: {after}";
        }

        if (field === "timeSpent") {
            return "set the time spent from: {before} to: {after}";
        }

        if (
            before &&
            (!Array.isArray(before) || (Array.isArray(before) && before.length)) &&
            !fieldsWithoutBefore.includes(field)
        ) {
            return "changed the {field} from: {before} to: {after}";
        }

        return "set the {field} to: {after}";
    }, [change]);

    if (!change) return <>Unable to parse activity log</>;

    const { field, before, after } = change;

    const parts = label.split(/(\{[^}]+\})/g);

    return (
        <>
            {parts.map((part, index) => {
                // FIELD NAME
                if (part === "{field}") {
                    if (fieldsTranslation[field]) {
                        return fieldsTranslation[field];
                    }
                    return field;
                }

                // AFTER
                else if (part === "{after}") {
                    if (field === "title") {
                        return (
                            <span
                                key={index}
                                dangerouslySetInnerHTML={{ __html: highlightDifferences(change) }}
                            />
                        );
                    } else {
                        return <ActivityParser key={index} field={field} value={after} />;
                    }
                }

                // BEFORE
                else if (part === "{before}") {
                    return <ActivityParser key={index} field={field} value={before} />;
                }

                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

function highlightDifferences(diff: IActivityChange): string {
    // If no before value is provided, treat the entire after string as new
    if (!diff.before) {
        return `<ins>${diff.after}</ins>`;
    }

    const before = diff.before;
    const after = diff.after;

    // Find the common prefix
    let i = 0;
    while (i < before.length && i < after.length && before[i] === after[i]) {
        i++;
    }

    // Find the common suffix
    let j = 1;
    while (
        j <= before.length - i &&
        j <= after.length - i &&
        before[before.length - j] === after[after.length - j]
    ) {
        j++;
    }
    j--;

    const prefix = before.slice(0, i);
    const oldPart = before.slice(i, before.length - j);
    const newPart = after.slice(i, after.length - j);
    const suffix = before.slice(before.length - j);

    return `${prefix}<del class="${Classes.TEXT_DISABLED}">${oldPart}</del>${newPart}${suffix}`;
}
