// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import classNames from "classnames";
import React from "react";

interface ISettingRowProps {
    title: string | React.ReactNode;
    description?: string | React.ReactNode;
    sectionTitle?: string | React.ReactNode;
    rightElement?: React.ReactNode;
    last?: boolean;
    marginTop?: boolean;
    children?: React.ReactNode;
}
export const SettingRow: React.FC<ISettingRowProps> = ({
    title,
    description,
    sectionTitle,
    rightElement,
    last,
    children,
    marginTop,
}) => {
    return (
        <div className={classNames("settings-row", { last })}>
            {sectionTitle && (
                <div
                    className={classNames("settings-row-section-title", { marginTop }, [
                        Classes.TEXT_DISABLED,
                    ])}
                >
                    {sectionTitle}
                </div>
            )}
            <div className="settings-row-header">
                <div className="settings-row-main">
                    <div className="settings-row-title">{title}</div>
                    {description && (
                        <div className={classNames("settings-row-description", Classes.TEXT_MUTED)}>
                            {description}
                        </div>
                    )}
                </div>
                {rightElement && <div className="settings-row-right">{rightElement}</div>}
            </div>
            {children && <div className="settings-row-content">{children}</div>}
        </div>
    );
};
