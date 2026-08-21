// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { useLocation, useNavigate } from "react-router-dom";
import { RecentsActions } from "app/store/actions/recents";
import { SIDEBARICON } from "@stacks/types";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const BookmarksButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleGotoPage = () => {
        navigate("/bookmarks");
        RecentsActions.add({
            title: translate("Bookmarks"),
            icon: SIDEBARICON.bookmarks,
            url: "/bookmarks",
        });
    };

    return (
        <SidebarButton
            data-testid="bookmarks-button"
            title="Bookmarks"
            translatedTitle={translate("Bookmarks")}
            icon={SIDEBARICON.bookmarks}
            isActive={location.pathname === "/bookmarks"}
            onClick={handleGotoPage}
        />
    );
};
