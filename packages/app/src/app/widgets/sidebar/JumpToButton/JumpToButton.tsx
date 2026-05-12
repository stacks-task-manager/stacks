// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Icon } from "app/components/common";
import { useNav } from "app/hooks";
import { IRecentItem, SIDEBARICON } from "@stacks/types";
import { RecentsActions } from "app/store/actions/recents";
import { RecentsStore } from "app/store/recents";
import { SidebarButton } from "../SidebarButton/SidebarButton";

export const JumpToButton = () => {
    return (
        <Popover
            content={
                <Menu>
                    <JumpToMenu />
                </Menu>
            }
            fill
            placement="right-start"
        >
            <SidebarButton
                title="Jump to"
                translatedTitle={translate("Jump to")}
                icon={SIDEBARICON.jumpto}
                data-testid="jumpto-button"
            />
        </Popover>
    );
};

export const JumpToMenu = () => {
    const { items } = RecentsStore.use();
    const location = useLocation();
    const navigate = useNavigate();
    const nav = useNav();

    useEffect(() => {
        RecentsActions.load();
    }, []);

    const handleOpenItem = (item: IRecentItem) => {
        RecentsActions.add(item);
        if (
            item.url.startsWith("/task") ||
            item.url.startsWith("/person") ||
            item.url.startsWith("/company")
        ) {
            nav(item.url, {
                state: {
                    backgroundLocation: location,
                },
            });
        } else {
            navigate(item.url);
        }
    };

    return (
        <>
            {items.length === 0 && <MenuItem text="No recent items" disabled />}
            {items.map((item: IRecentItem, index: number) => (
                <MenuItem
                    key={index}
                    text={item.title}
                    icon={<Icon icon={item.icon} />}
                    onClick={() => handleOpenItem(item)}
                />
            ))}
            {items.length > 0 && (
                <>
                    <MenuDivider />
                    <MenuItem
                        text={translate("Clear recently opened")}
                        icon={<Icon icon="trash" />}
                        onClick={RecentsActions.clear}
                    />
                </>
            )}
        </>
    );
};
