// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Avatar } from "app/components/common";
import { IPerson } from "@stacks/types";
import { useMousetrap } from "app/hooks";

interface PersonDetailsAvatarProps {
    person: IPerson;
    onClick: () => void;
}
export const PersonDetailsAvatar: FunctionComponent<PersonDetailsAvatarProps> = ({ person, onClick }) => {
    useMousetrap("shift+a", onClick);
    return (
        <div className="person-details__avatar editable" onClick={onClick}>
            <Avatar person={person} huge key={person.avatar} />
            <small className={Classes.TEXT_DISABLED}>Click to change</small>
        </div>
    );
};
