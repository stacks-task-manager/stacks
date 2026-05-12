// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { Switch } from "@blueprintjs/core";
import Log from "app/utils/log";
import { IPanelInterface } from ".";
import { SettingRow } from "app/components/common";

export class NotificationsPanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][InterfacePanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel">
                <SettingRow
                    sectionTitle="Notifications"
                    title="Show announcements notifications"
                    description="When enabled, you will see announcements messages. Usually these annoucements popups will usually let you vote on the next feature."
                    rightElement={
                        <Switch
                            checked={preferences.showAnnouncements}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showAnnouncements", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    sectionTitle={translate("Sounds")}
                    title={translate("Enable sounds")}
                    description="When turned on, you will hear sounds when you interract with the app."
                    last
                    rightElement={
                        <Switch
                            checked={preferences.sounds}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("sounds", event.currentTarget.checked)
                            }
                        />
                    }
                />
            </div>
        );
    }
}
