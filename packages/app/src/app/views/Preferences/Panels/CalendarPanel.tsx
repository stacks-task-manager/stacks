// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import Log from "app/utils/log";
import { IPanelInterface } from ".";
import { SettingRow } from "app/components/common";
import { HTMLSelect, Switch } from "@blueprintjs/core";

export class CalendarPanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][ThemesPanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel">
                <SettingRow
                    sectionTitle={translate("Calendar")}
                    title={translate("Use a 24 hour clock")}
                    description={translate("Switch between 12 and 24 hour time format")}
                    rightElement={
                        <Switch
                            checked={preferences.show24Hours}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("show24Hours", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Default calendar view")}
                    description={translate("Select the calendar view you wish to see by default")}
                    rightElement={
                        <HTMLSelect
                            value={preferences.calendarDefaultView}
                            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                                onChange("calendarDefaultView", event.currentTarget.value)
                            }
                            options={[
                                {
                                    label: translate("Month view"),
                                    value: "month",
                                },
                                {
                                    label: translate("Week view"),
                                    value: "week",
                                },
                                {
                                    label: translate("Day view"),
                                    value: "day",
                                },
                                // {
                                //     label: translate("Agenda"),
                                //     value: "agenda",
                                // },
                            ]}
                        />
                    }
                />

                <SettingRow
                    title="Show all events in the monthly view"
                    description="When enabled it will show you the complete list of events in the calendar cell."
                    rightElement={
                        <Switch
                            checked={preferences.calendarShowAllEvents}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("calendarShowAllEvents", event.currentTarget.checked)
                            }
                        />
                    }
                />
            </div>
        );
    }
}
