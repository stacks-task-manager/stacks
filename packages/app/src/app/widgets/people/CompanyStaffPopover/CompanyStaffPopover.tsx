// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Menu, Popover, Tag } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Icon, Scroller } from "app/components/common";
import { useCompanyStaff } from "app/hooks";
import { IPerson } from "@stacks/types";
import { PersonItem } from "../PersonItem/PersonItem";

interface ICompanyStaffPopoverProps {
    companyId: string;
}
export const CompanyStaffPopover: FunctionComponent<ICompanyStaffPopoverProps> = ({ companyId }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const staff = useCompanyStaff(companyId);

    const openPerson = (person: IPerson) => {
        navigate(`/person/${person.id}`, {
            state: { backgroundLocation: location },
        });
    };

    if (!staff.length) return null;

    return (
        <Popover
            content={
                <Scroller minWidth={300} thin>
                    <Menu>
                        {staff.map((person: IPerson) => {
                            return (
                                <PersonItem
                                    key={person.id}
                                    person={person}
                                    dismissable
                                    onClick={() => openPerson(person)}
                                />
                            );
                        })}
                    </Menu>
                </Scroller>
            }
        >
            <Tag minimal round interactive>
                <Icon icon="users" size={12} /> {staff.length}
            </Tag>
        </Popover>
    );
};
