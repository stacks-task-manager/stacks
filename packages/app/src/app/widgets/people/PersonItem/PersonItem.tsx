// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

import { Avatar, Icon } from "app/components/common";
import { IPerson } from "@stacks/types";
import { PersonRole } from "../PersonRole/PersonRole";

interface IPersonItemProps {
    person: IPerson;
    selected?: boolean;
    small?: boolean;
    active?: boolean;
    dismissable?: boolean;
    me?: boolean;
    disabled?: boolean;
    onClick: (event: React.MouseEvent) => void;
}
export const PersonItem: FunctionComponent<IPersonItemProps> = ({
    person,
    selected,
    small,
    active,
    dismissable,
    me,
    disabled,
    onClick,
}) => {
    return (
        <li id={`person-${person.id}`}>
            <a
                role="menuitem"
                tabIndex={-1}
                className={classNames(Classes.MENU_ITEM, {
                    [Classes.ACTIVE]: active,
                    [Classes.POPOVER_DISMISS]: dismissable,
                    [Classes.DISABLED]: disabled,
                })}
                style={{ alignItems: "center" }}
                onClick={disabled ? undefined : onClick}
            >
                <Avatar person={person} small={small} selected={selected} />
                <div className={classNames(Classes.FILL, Classes.TEXT_OVERFLOW_ELLIPSIS)}>
                    {me && (
                        <>
                            <strong>Me</strong>{" "}
                            <span className={Classes.TEXT_DISABLED}>
                                ({person.firstName} {person.lastName})
                            </span>
                        </>
                    )}
                    {!me && (
                        <strong>
                            {person.firstName} {person.lastName}
                        </strong>
                    )}
                    {!small && <div className={Classes.TEXT_MUTED}>{person.email}</div>}
                </div>
                <PersonRole roleId={person.role} />
                {selected && <Icon icon="check" />}
            </a>
        </li>
    );
};
