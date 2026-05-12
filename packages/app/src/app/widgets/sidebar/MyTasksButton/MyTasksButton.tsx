// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RecentsActions } from "app/store/actions/recents";
import { SIDEBARICON } from "@stacks/types";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const MyTasksButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGotoPage = () => {
        navigate("/mytasks");
        RecentsActions.add({
            title: translate("My tasks"),
            icon: SIDEBARICON.mytasks,
            url: "/mytasks",
        });
    };

    return (
        <SidebarButton
            title="My tasks"
            translatedTitle={translate("My tasks")}
            icon={SIDEBARICON.mytasks}
            isActive={location.pathname === "/mytasks"}
            onClick={handleGotoPage}
            data-testid="my-tasks-button"
        />
    );
};
