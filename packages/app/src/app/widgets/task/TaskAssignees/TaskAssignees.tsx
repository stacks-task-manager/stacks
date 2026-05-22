// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useMemo } from "react";
import { RoundButton } from "app/components/common";
import { IPerson } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { TasksActions } from "app/store/actions";
import { AssigneesPopover } from "../../people/AssigneesPopover/AssigneesPopover";
import { Assignees } from "../../people/Assignees/Assignees";

interface ITaskAssigneesProps {
    assignees: string[];
    taskId?: string;
    showEmpty?: boolean;
    minimal?: boolean;
    tooltip?: string;
    max?: number;
    disabled?: boolean;
    className?: string;
    onToggle?: (personId: string) => void;
    onClear?: () => void;
}
export const TaskAssignees: FunctionComponent<ITaskAssigneesProps> = ({
    assignees,
    taskId,
    showEmpty,
    minimal,
    tooltip,
    max,
    disabled,
    className,
    onToggle,
    onClear,
}) => {
    const people = useMemo(() => {
        if (assignees.length === 0) return [];
        const { people } = PeopleStore.get();
        return people.filter((person: IPerson) => assignees.includes(person.id));
    }, [assignees]);

    const handleTogglePerson = (personId: string) => {
        if (taskId) {
            TasksActions.toggleAssignee(taskId, personId);
        } else if (onToggle) {
            onToggle(personId);
        }
    };

    const handleClear = () => {
        if (taskId) {
            TasksActions.setAssignees(taskId, []);
        } else if (onClear) {
            onClear();
        }
    };

    if (assignees.length === 0 && !showEmpty) return null;

    return (
        <AssigneesPopover
            value={assignees}
            disabled={disabled}
            className={className}
            onToggle={handleTogglePerson}
            onClear={handleClear}
        >
            {assignees.length > 0 ? (
                <Assignees assignees={people} max={max || 5} small interractive />
            ) : (
                <RoundButton
                    dashed
                    icon={minimal ? "user-add" : undefined}
                    title={minimal ? undefined : translate("Assign task")}
                    tooltip={tooltip || translate("Assign task")}
                    disabled={disabled}
                />
            )}
        </AssigneesPopover>
    );
};
