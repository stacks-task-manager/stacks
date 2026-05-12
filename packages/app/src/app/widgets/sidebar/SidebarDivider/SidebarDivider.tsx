// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { MaybeElement } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

interface ISidebarDividerProps {
    title: string | React.ReactNode;
    children?: MaybeElement | MaybeElement[];
}
export const SidebarDivider: FunctionComponent<ISidebarDividerProps> = ({ title, children }) => {
    return (
        <div className="sidebar-divider">
            <div className="sidebar-divider-title">{title}</div>
            {children}
        </div>
    );
};
