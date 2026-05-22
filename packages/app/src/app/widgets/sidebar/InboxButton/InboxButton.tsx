// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { MenuItem } from "@blueprintjs/core";
import { SIDEBARICON } from "@stacks/types";
import { Counter, Icon } from "app/components/common";
import { RecentsActions } from "app/store/actions/recents";
import { SidebarButton } from "../SidebarButton/SidebarButton";
import { useUnreadCount } from "app/hooks";

export const InboxButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const url = "/inbox";

    const unread = useUnreadCount();

    const handleGotoPage = () => {
        navigate(url);
        RecentsActions.add({
            title: "Inbox",
            icon: SIDEBARICON.inbox,
            url,
        });
    };

    return (
        <SidebarButton
            title="Inbox"
            translatedTitle="Inbox"
            icon={SIDEBARICON.inbox}
            isActive={location.pathname === url}
            onClick={handleGotoPage}
            data-testid="inbox-button"
        >
            <Counter
                danger={unread}
                dangerTooltip={`${unread} unread notifications`}
            />
        </SidebarButton>
    );
};

export const InboxMenuItem = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const url = "/inbox";

    const handleGotoPage = () => {
        navigate(url);
        RecentsActions.add({
            title: "Inbox",
            icon: SIDEBARICON.inbox,
            url,
        });
    };

    return (
        <MenuItem
            text="Inbox"
            icon={<Icon icon={SIDEBARICON.inbox} />}
            active={location.pathname === url}
            onClick={handleGotoPage}
        />
    );
};