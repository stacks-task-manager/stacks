// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Tooltip } from "@blueprintjs/core";
import React from "react";
import { Icon } from "app/components/common";

export const SidebarToolbar = () => (
    <div id="sidebar-toolbar">
        <Tooltip content={`${translate("Search")}...`} placement="bottom">
            <Button
                minimal
                small
                icon={
                    <span className={Classes.ICON}>
                        <Icon icon="search" />
                    </span>
                }
            />
        </Tooltip>
        <Button
            minimal
            small
            icon={
                <span className={Classes.ICON}>
                    <Icon icon="edit" />
                </span>
            }
        />
    </div>
);
