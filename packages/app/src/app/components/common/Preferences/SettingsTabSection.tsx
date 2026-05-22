// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

interface ISettingsTabSectionProps {
    title: string | React.ReactNode;
    icon: React.ReactNode;
}
export const SettingsTabSection: FunctionComponent<ISettingsTabSectionProps> = ({ title, icon }) => {
    return (
        <div className="settings-tab-section">
            {icon} {title}
        </div>
    );
};
