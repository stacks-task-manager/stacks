// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { SIDEBARICON } from "@stacks/types";
import { translate } from "@stacks/translations";
import { useLocation, useNavigate } from "react-router-dom";
import { RecentsActions } from "app/store/actions/recents";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const WorkbooksButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const goToWorkbooks = () => {
        navigate("/workbooks");
        RecentsActions.add({
            title: translate("Workbooks"),
            icon: SIDEBARICON.workbooks,
            url: "/workbooks",
        });
    };

    return (
        <SidebarButton
            data-testid="workbooks-button"
            title="Workbooks"
            translatedTitle={translate("Workbooks")}
            icon={SIDEBARICON.workbooks}
            isActive={location.pathname.startsWith("/workbooks")}
            onClick={goToWorkbooks}
        />
    );
};
