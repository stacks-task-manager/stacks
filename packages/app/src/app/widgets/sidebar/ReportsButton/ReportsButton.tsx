// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RecentsActions } from "app/store/actions/recents";
import { SIDEBARICON } from "@stacks/types";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const ReportsButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGotoPage = () => {
        navigate("/reports");
        RecentsActions.add({
            title: translate("Reports"),
            icon: SIDEBARICON.reports,
            url: "/reports",
        });
    };

    return (
        <SidebarButton
            title="Reports"
            translatedTitle={translate("Reports")}
            icon={SIDEBARICON.reports}
            isActive={location.pathname === "/reports"}
            onClick={handleGotoPage}
            data-testid="reports-button"
        />
    );
};
