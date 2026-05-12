// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { shallowEqual } from "app/hooks/store";
import React from "react";
import { Outlet } from "react-router-dom";

import { PeopleStore } from "app/store/people";
import { AppView, PeopleFilter, ToolbarPeople } from "app/widgets";
import { Companies } from "./Companies/Companies";
import { PeopleList } from "./List/PeopleList";
import { PeopleTimesheet } from "./Timesheet/PeopleTimesheet";
import { PeopleApprovals } from "./Approvals/PeopleApprovals";
import { PeopleRoles } from "./Roles/Roles";
import { AccessGate } from "app/components/common";
import { ROLE_SECTIONS } from "@stacks/types";

export const People = () => {
    const { viewType } = PeopleStore.use(
        state => ({
            isLoading: state.isLoading,
            viewType: state.viewType,
        }),
        shallowEqual
    );

    return (
        <AppView
            toolbar={<ToolbarPeople />}
            append={
                <>
                    <PeopleFilter />
                    <Outlet />
                </>
            }
        >
            {viewType === "contacts" && <AccessGate section={ROLE_SECTIONS.PEOPLE}><PeopleList /></AccessGate>}
            {viewType === "companies" && <AccessGate section={ROLE_SECTIONS.COMPANIES}><Companies /></AccessGate>}
            {viewType === "timesheet" && <AccessGate section={ROLE_SECTIONS.TIMELOGS}><PeopleTimesheet /></AccessGate>}
            {viewType === "approvals" && <AccessGate section={ROLE_SECTIONS.TIMELOGS}><PeopleApprovals /></AccessGate>}
            {viewType === "roles" && <AccessGate section={ROLE_SECTIONS.ROLES}><PeopleRoles /></AccessGate>}
        </AppView >
    );
};
