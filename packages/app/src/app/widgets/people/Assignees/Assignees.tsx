// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Position, Tooltip } from "@blueprintjs/core";
import classnames from "classnames";

import { IPerson } from "@stacks/types";
import { Avatar } from "app/components/common/Avatar/Avatar";
import { PeopleStore } from "app/store/people";

interface IAssigneesProps {
    id?: string;
    assignees: IPerson[] | string[];
    small?: boolean;
    narrow?: boolean;
    max?: number;
    interractive?: boolean;
    hideWhenEmpty?: boolean;
    testId?: string;
    onRemove?: (assigneeId: string) => void;
    onClick?: () => void;
}

export const Assignees: FunctionComponent<IAssigneesProps> = ({
    id,
    assignees,
    small,
    narrow,
    max,
    interractive,
    hideWhenEmpty,
    testId,
    onRemove,
    onClick,
}) => {
    const storePeople = PeopleStore.use(state => state.people);
    const people = useMemo(() => {
        if (assignees.length === 0 || typeof assignees[0] !== "string") {
            return assignees as IPerson[];
        }

        const ids = new Set(assignees as string[]);
        return storePeople.filter(person => ids.has(person.id));
    }, [assignees, storePeople]);

    const renderMore = useMemo(() => {
        if (!max || people.length - 1 < max) return null;

        const rest = people.slice(max);
        const names = (
            <React.Fragment>
                {rest.map(assignee => (
                    <div key={assignee.id}>
                        {assignee.firstName} {assignee.lastName}
                    </div>
                ))}
            </React.Fragment>
        );

        return (
            <div className={classnames("avatar more", { small, narrow })}>
                <Tooltip content={names} placement={Position.TOP} usePortal>
                    {`+${rest.length.toString()}`}
                </Tooltip>
            </div>
        );
    }, [people, small, narrow, max]);

    if (hideWhenEmpty && people.length === 0) return null;

    return (
        <div
            className={classnames("assignees", { interractive })}
            id={id}
            onClick={onClick}
            data-testid={testId}
        >
            {people.slice(0, max).map(assignee => (
                <Avatar
                    person={assignee}
                    key={assignee.id}
                    onClick={onRemove ? () => onRemove(assignee.id) : undefined}
                    showTooltip
                    narrow={narrow}
                    small={small}
                />
            ))}
            {renderMore}
        </div>
    );
};
