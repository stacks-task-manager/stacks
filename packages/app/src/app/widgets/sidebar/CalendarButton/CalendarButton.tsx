// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RecentsActions } from "app/store/actions/recents";
import { SIDEBARICON } from "@stacks/types";
import { Counter } from "app/components/common";
import { CalendarStore } from "app/store/calendar";
import { shallowEqual } from "app/hooks/store";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const CalendarButton = () => {
    const count = CalendarStore.use(state => state.todaysCount, shallowEqual);
    const navigate = useNavigate();
    const location = useLocation();

    const handleGotoPage = () => {
        navigate("/calendar");
        RecentsActions.add({
            title: translate("Calendar"),
            icon: SIDEBARICON.calendar,
            url: "/calendar",
        });
    };

    return (
        <SidebarButton
            title="Calendar"
            translatedTitle={translate("Calendar")}
            icon={SIDEBARICON.calendar}
            isActive={location.pathname === "/calendar"}
            onClick={handleGotoPage}
            data-testid="calendar-button"
        >
            <Counter
                success={count.events}
                successTooltip={`${count.events} event happening today`}
                warning={count.birthdays}
                warningTooltip={`${count.birthdays} person is celebrating his/hers birthday today`}
                danger={count.tasks}
                dangerTooltip={`${count.tasks} tasks are due today`}
            />
        </SidebarButton>
    );
};
