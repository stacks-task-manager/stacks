// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { useLocation } from "react-router-dom";
import { shallowEqual } from "app/hooks/store";
import { isSameDay } from "date-fns";

import { Counter } from "app/components/common";
import { useNav } from "app/hooks";
import { SIDEBARICON } from "@stacks/types";
import { RecentsActions } from "app/store/actions/recents";
import { PeopleStore } from "app/store/people";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const PeopleButton = () => {
    const navigate = useNav();
    const location = useLocation();
    const { total, success } = PeopleStore.use(
        state => ({
            total: state.people.length,
            success: state.people.filter(person => {
                return person.birthday != null && isSameDay(person.birthday, new Date());
            }).length,
        }),
        shallowEqual
    );

    const handleGoToPeople = () => {
        navigate("/people");
        RecentsActions.add({
            title: translate("People"),
            icon: SIDEBARICON.people,
            url: "/people",
        });
    };

    return (
        <SidebarButton
            title="People"
            translatedTitle={translate("People")}
            icon={SIDEBARICON.people}
            isActive={location.pathname === "/people"}
            onClick={handleGoToPeople}
            data-testid="people-button"
        >
            <Counter
                total={total}
                success={success}
                successTooltip={`${success} people are celebrating their birtday today`}
            />
        </SidebarButton>
    );
};
