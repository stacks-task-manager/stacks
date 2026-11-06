// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Tooltip } from "@blueprintjs/core";

interface IToolbarTitleProps {
    title: string | React.JSX.Element;
    subtitle?: string | React.JSX.Element;
    icon?: React.ReactNode;
}

export const ToolbarTitle: FunctionComponent<IToolbarTitleProps> = ({ title, subtitle, icon }) => {
    return (
        <div className="toolbar-item">
            <div className="toolbar-title">
                <div className="title">
                    {icon}
                    {title}
                </div>
                {subtitle && (
                    <Tooltip content={subtitle} placement="right" hoverOpenDelay={1000}>
                        <div className="subtitle">{subtitle}</div>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};
