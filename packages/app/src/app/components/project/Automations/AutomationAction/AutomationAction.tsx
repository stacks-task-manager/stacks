// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Intent } from "@blueprintjs/core";
import { Draggable } from "@hello-pangea/dnd";
import classNames from "classnames";
import React, { FunctionComponent, useMemo } from "react";
import { AUTOMATION_DO, IAutomationAction, TAGSECTION } from "@stacks/types";
import { Icon } from "app/components/common";
import { getStack, getTag } from "app/hooks";
import { PeopleStore } from "app/store/people";
import { Tags, TagsWrapper } from "app/widgets";

interface IAutomationActionProps {
    action: Partial<IAutomationAction>;
    index: number;
    onRemove: (aId: string) => void;
}
export const AutomationAction: FunctionComponent<IAutomationActionProps> = ({ action, index, onRemove }) => {
    const icon: string = useMemo(() => {
        // TODO: this needs to be a const
        if (action.do === AUTOMATION_DO.ASSIGN) return "user-add";
        if (action.do === AUTOMATION_DO.UNASSIGN) return "user-remove";
        if (action.do === AUTOMATION_DO.UNASSIGNALL) return "users-x";
        if (
            action.do === AUTOMATION_DO.STARTDATE ||
            action.do === AUTOMATION_DO.DUEDATE ||
            action.do === AUTOMATION_DO.DODATE
        )
            return "calendar-date";
        if (action.do === AUTOMATION_DO.ADDTAG || action.do === AUTOMATION_DO.REMOVETAG) return "tag";
        if (action.do === AUTOMATION_DO.REMOVEALLTAGS) return "tags";
        if (action.do === AUTOMATION_DO.DONE) return "check-circle";
        if (action.do === AUTOMATION_DO.TODO) return "circle";
        if (action.do === AUTOMATION_DO.ARCHIVE) return "archive";
        if (action.do === AUTOMATION_DO.ADDSTATUS) return "activity";
        if (action.do === AUTOMATION_DO.MOVE) return "switch-horizontal-01";
        if (action.do === AUTOMATION_DO.PROGRESS) return "percent-02";

        return "check";
    }, [action.do]);

    const actionLabel = useMemo(() => {
        if (action.do === AUTOMATION_DO.ASSIGN) {
            const { people } = PeopleStore.get();
            const person = people.find(p => p.id === action.value);
            return (
                <>
                    Assign to <strong>{person && `${person.firstName} ${person.lastName}`}</strong>.
                </>
            );
        }

        if (action.do === AUTOMATION_DO.UNASSIGN) {
            const { people } = PeopleStore.get();
            const person = people.find(p => p.id === action.value);
            return (
                <>
                    Unassign <strong>{person && `${person.firstName} ${person.lastName}`}</strong>.
                </>
            );
        }

        if (action.do === AUTOMATION_DO.UNASSIGNALL) {
            return translate("Unassign everyone");
        }

        if (
            action.do === AUTOMATION_DO.STARTDATE ||
            action.do === AUTOMATION_DO.DUEDATE ||
            action.do === AUTOMATION_DO.DODATE
        ) {
            let label = "start";
            if (action.do === AUTOMATION_DO.DUEDATE) {
                label = "due";
            } else if (action.do === AUTOMATION_DO.DODATE) {
                label = "do";
            }

            return (
                <>
                    Set <strong>{label} date</strong> in <strong>{action.value}</strong> days.
                </>
            );
        }

        if (action.do === AUTOMATION_DO.ADDTAG) {
            return (
                <>
                    {translate("Assign tags")}{" "}
                    <TagsWrapper nowrap>
                        <Tags value={action.value as string[]} section={TAGSECTION.PROJECTS} max={1} />
                    </TagsWrapper>
                </>
            );
        }

        if (action.do === AUTOMATION_DO.REMOVETAG) {
            return (
                <>
                    {translate("Remove tags")}{" "}
                    <TagsWrapper nowrap>
                        <Tags value={action.value as string[]} section={TAGSECTION.PROJECTS} max={1} />
                    </TagsWrapper>
                </>
            );
        }

        if (action.do === AUTOMATION_DO.REMOVEALLTAGS) {
            return translate("Remove all tags");
        }

        if (action.do === AUTOMATION_DO.DONE || action.do === AUTOMATION_DO.TODO) {
            return (
                <>
                    {translate("Mark task as")}{" "}
                    {action.do === AUTOMATION_DO.DONE ? translate("done") : translate("todo")}
                </>
            );
        }

        if (action.do === AUTOMATION_DO.ARCHIVE) {
            return translate("Archive task");
        }

        if (action.do === AUTOMATION_DO.ADDSTATUS) {
            const status = getTag(action.value as string);
            return (
                <>
                    {translate("Add status")} {status?.title}
                </>
            );
        }

        if (action.do === AUTOMATION_DO.REMOVESTATUS) {
            return translate("Remove status");
        }

        if (action.do === AUTOMATION_DO.MOVE) {
            const stack = getStack(action.value as string);
            return (
                <>
                    {translate("Move task to")} <strong>{stack?.title}</strong>
                </>
            );
        }

        if (action.do === AUTOMATION_DO.PROGRESS) {
            return (
                <>
                    {translate("Set task progress to")} <strong>{action.value}%</strong>
                </>
            );
        }

        return null;
    }, [action.do]);

    const handleRemoveAction = () => {
        if (!action.id) return;
        onRemove(action.id);
    };

    return (
        <Draggable draggableId={action.id ?? ""} index={index}>
            {(provided, snapshot) => (
                <div
                    className={classNames("automation-action automation-box-row", {
                        dragging: snapshot.isDragging,
                    })}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                >
                    <div className="automation-action-drag-handle" {...provided.dragHandleProps}>
                        <Icon icon="drag" size={18} />
                    </div>
                    <div className="automation-action-content">
                        <div className="automation-action-icon">
                            <Icon icon={icon} />
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>{actionLabel}</div>
                    </div>

                    <Button
                        className="automation-action-delete"
                        minimal
                        small
                        icon={<Icon icon="trash" />}
                        intent={Intent.DANGER}
                        onClick={handleRemoveAction}
                    />
                </div>
            )}
        </Draggable>
    );
};
