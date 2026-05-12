// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Popover } from "@blueprintjs/core";
import React from "react";

import { Icon } from "app/components/common";
import { usePerson } from "app/hooks";
import { APPICONS } from "@stacks/types";
import { PersonInfo } from "app/widgets/people";

export const Person = ({ id }: { id?: string }) => {
    const { person } = usePerson(id);
    if (!person) return null;

    return (
        <Popover
            content={<PersonInfo personId={person.id} />}
            popoverClassName="popover-padded"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <span {...props} className="mention">
                    <Icon icon={APPICONS.PERSON} size={13} /> {`${person.firstName} ${person.lastName}`}
                </span>
            )}
        />
    );
};
