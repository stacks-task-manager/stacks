// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import { Position, Tooltip } from "@blueprintjs/core";
import classnames from "classnames";

import { IPerson } from "@stacks/types";
import { Avatar } from "app/components/common";
import { PeopleStore } from "app/store/people";

interface IAssigneesProps {
    id?: string;
    assignees: IPerson[];
    small?: boolean;
    narrow?: boolean;
    max?: number;
    interractive?: boolean;
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
    testId,
    onRemove,
    onClick,
}) => {
    const renderMore = useMemo(() => {
        if (!max || assignees.length - 1 < max) return null;

        const rest = assignees.slice(max);
        const names = (
            <React.Fragment>
                {rest.map((assignee: IPerson) => {
                    return (
                        <div key={assignee.id}>
                            {assignee.firstName} {assignee.lastName}
                        </div>
                    );
                })}
            </React.Fragment>
        );

        return (
            <div className={classnames("avatar more", { small, narrow })}>
                <Tooltip content={names} placement={Position.TOP} usePortal>
                    {`+${rest.length.toString()}`}
                </Tooltip>
            </div>
        );
    }, [assignees]);

    return (
        <div className={classnames("assignees", { interractive })} id={id} onClick={onClick} data-testid={testId}>
            {assignees.slice(0, max).map((assignee: IPerson) => (
                <Avatar
                    person={assignee}
                    key={assignee.id}
                    onClick={onRemove ? () => onRemove!(assignee.id) : undefined}
                    showTooltip
                    narrow={narrow}
                    small={small}
                />
            ))}
            {renderMore}
        </div>
    );
};

interface IAssigneesSyncProps {
    assignees?: string[];
    small?: boolean;
    narrow?: boolean;
    max?: number;
    interractive?: boolean;
    onRemove?: (assigneeId: string) => void;
    onClick?: () => void;
}

export const AssigneesSync: FunctionComponent<IAssigneesSyncProps> = ({
    assignees,
    small,
    narrow,
    max,
    interractive,
    onRemove,
    onClick,
}) => {
    const people = useMemo(() => {
        return PeopleStore.get().people.filter(person => assignees?.includes(person.id));
    }, [assignees]);

    const renderMore = useMemo(() => {
        if (!max || people.length - 1 < max) return null;

        const rest = people.slice(max);
        const names = (
            <React.Fragment>
                {rest.map((assignee: IPerson) => {
                    return (
                        <div key={assignee.id}>
                            {assignee.firstName} {assignee.lastName}
                        </div>
                    );
                })}
            </React.Fragment>
        );

        return (
            <div className={classnames("avatar more", { small, narrow })}>
                <Tooltip content={names} placement={Position.TOP} usePortal>
                    {`+${rest.length.toString()}`}
                </Tooltip>
            </div>
        );
    }, [people]);

    if (people.length === 0) return null;

    return (
        <div className={classnames("assignees", { interractive })} onClick={onClick}>
            {people.slice(0, max).map((assignee: IPerson) => (
                <Avatar
                    person={assignee}
                    key={assignee.id}
                    onClick={onRemove ? () => onRemove!(assignee.id) : undefined}
                    showTooltip
                    narrow={narrow}
                    small={small}
                />
            ))}

            {renderMore}
        </div>
    );
};
