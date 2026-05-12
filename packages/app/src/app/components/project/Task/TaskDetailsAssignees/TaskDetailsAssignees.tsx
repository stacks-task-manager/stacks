// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useMemo, useState } from "react";
import { RoundButton } from "app/components/common";
import { TasksActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { IPerson } from "@stacks/types";
import { Assignees, PeopleDialog } from "app/widgets";
import { useElementHotkey } from "app/hooks";

interface ITaskDetailsAssigneesProps {
    taskId: string;
    assignees: string[];
    disabled?: boolean;
    single?: boolean;
    large?: boolean;
    onChange?: (assignees: string[]) => void;
}
export const TaskDetailsAssignees: FunctionComponent<ITaskDetailsAssigneesProps> = ({
    taskId,
    assignees,
    disabled,
    single,
    large,
    onChange,
}) => {
    useElementHotkey("shift+a", "td-assignees");

    const people = useMemo(() => {
        const { people } = PeopleStore.get();
        return people ? people.filter((person: IPerson) => assignees.includes(person.id)) : [];
    }, [assignees]);
    const [open, setOpen] = useState(false);

    const handleClose = (peopleIds: string[]) => {
        if (onChange) {
            onChange(peopleIds);
        } else {
            TasksActions.setAssignees(taskId, peopleIds);
        }
    };

    const handleClosed = () => {
        setOpen(false);
    };

    const handleOpen = () => {
        if (disabled) return;
        setOpen(true);
    };

    return (
        <span>
            {people.length === 0 && (
                <RoundButton
                    dashed
                    id="td-assignees"
                    title={translate("Add people")}
                    disabled={disabled}
                    onClick={handleOpen}
                    testId="task-details-assignees"
                />
            )}

            {people.length > 0 && (
                <Assignees
                    id="td-assignees"
                    assignees={people}
                    max={5}
                    interractive={!disabled}
                    small={!large}
                    onClick={handleOpen}
                    testId="task-details-assignees"
                />
            )}

            {open && (
                <PeopleDialog
                    value={assignees}
                    single={single}
                    onClosed={handleClosed}
                    onClose={handleClose}
                />
            )}
        </span>
    );
};
