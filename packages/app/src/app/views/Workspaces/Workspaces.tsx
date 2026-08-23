// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect } from "react";
import {
    Icon as AppIcon,
    BookmarkDialog,
    HelpButton,
    HotkeyTooltip,
    PermissionsDialog,
} from "app/components/common";

import { useMousetrap } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { togglePreferences, toggleSidebar } from "app/store/global";
import {
    ConnectionStatus,
    FeedbackButton,
    Me,
    NewTaskWrapper,
    SearchButton,
    WhatsNewButton,
} from "app/widgets";

export const Workspaces = () => {
    useEffect(() => {
        (async () => {
            await RecordActions.load();
        })();
    }, []);

    useMousetrap("meta+,", () => togglePreferences());
    useMousetrap("meta+b", () => toggleSidebar());

    return (
        <div id="workspaces">
            <AppIcon icon="app-icon" size={28} />
            <ConnectionStatus />

            <div className="spring" />
            <div className="workspaces-footer">
                <WhatsNewButton />
                <SearchButton />
                <PreferencesButton />
                <FeedbackButton />
                <HelpButton />
            </div>
            <Me />
            <NewTaskWrapper />
            <BookmarkDialog />
            <PermissionsDialog />
        </div>
    );
};

const PreferencesButton = () => {
    const handlePreferencesClick = () => {
        togglePreferences();
    };

    return (
        <HotkeyTooltip
            title={translate("Preferences")}
            keys={["meta", ","]}
            placement="right"
            horizontal
            small
        >
            <div
                className="workspace-button"
                onClick={handlePreferencesClick}
                data-testid="preferences-button"
            >
                <AppIcon icon="settings-02" />
            </div>
        </HotkeyTooltip>
    );
};
