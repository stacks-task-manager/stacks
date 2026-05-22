// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { IPerson } from "@stacks/types";
import classNames from "classnames";
import { Button } from "@blueprintjs/core";
import { Avatar, Icon } from "app/components/common";

interface IAvatarChipProps {
    person: IPerson;
    small?: boolean;
    large?: boolean;
    onRemove?: () => void;
}
export const AvatarChip: FunctionComponent<IAvatarChipProps> = ({ person, small, large, onRemove }) => {
    return (
        <div className={classNames("avatar-chip", { small, large })}>
            <Avatar person={person} small={small} large={large} />
            <div className="avatar-chip__name">
                {person.firstName} {person.lastName}
            </div>

            {onRemove && <Button variant="minimal" size="small" icon={<Icon icon="close" />} onClick={onRemove} />}
        </div>
    );
};
