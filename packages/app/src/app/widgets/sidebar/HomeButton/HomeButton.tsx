// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RecentsActions } from "app/store/actions/recents";
import { SIDEBARICON } from "@stacks/types";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const HomeButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGotoPage = () => {
        navigate("/home");
        RecentsActions.add({
            title: translate("Home"),
            icon: SIDEBARICON.home,
            url: "/home",
        });
    };

    return (
        <SidebarButton
            title="Home"
            translatedTitle={translate("Home")}
            icon={SIDEBARICON.home}
            isActive={location.pathname === "/home"}
            data-testid="home-button"
            onClick={handleGotoPage}
        />
    );
};
