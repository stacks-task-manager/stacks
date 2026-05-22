// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Callout, Intent, Menu, MenuItem, Popover, Switch } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import React from "react";

import { SettingRow } from "app/components/common";
import { DateLocales } from "app/locale";
import { setDateFnsLocale } from "app/utils/date";
import { IPanelInterface } from ".";

export class AppPanel extends React.Component<IPanelInterface> {
    render() {
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel">
                <SettingRow
                    sectionTitle={translate("Interface")}
                    title={translate("Hide scrollbars")}
                    description={translate("Hides the overall app scrollbars to give a more minimal look")}
                    rightElement={
                        <Switch
                            checked={preferences.hideScrollbars}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("hideScrollbars", event.currentTarget.checked)
                            }
                        />
                    }
                />

                <SettingRow
                    title={translate("Show animations")}
                    description={translate("Show animations like progress bar counters and others")}
                    rightElement={
                        <Switch
                            checked={preferences.showAnimations}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("showAnimations", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                />

                <SettingRow
                    sectionTitle={translate("Home")}
                    title={translate("Save home data in your workspace")}
                    description={translate(
                        "This will save some of the current home widgets data inside your current workspace"
                    )}
                    rightElement={
                        <Switch
                            checked={preferences.saveHomeToWorkspace}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                onChange("saveHomeToWorkspace", event.currentTarget.checked)
                            }
                        />
                    }
                    last
                >
                    {preferences.saveHomeToWorkspace ? (
                        <Callout intent={Intent.PRIMARY}>
                            {translate(
                                "We recommend turning this option OFF to keep your todos and notes private and secure When this option is turned off your Home todos and notes will be accessible only from this device"
                            )}
                        </Callout>
                    ) : null}
                </SettingRow>

                <SettingRow
                    last
                    title={translate("Date locale")}
                    description={translate("You can change the date format here based your location")}
                    rightElement={
                        <Popover content={this.renderDateLocaleSelector()}>
                            <Button>{DateLocales[this.getDateLocaleLabel()]}</Button>
                        </Popover>
                    }
                />

                {/* <SettingRow
                    title="Timezone"
                    description="You can change the timezone format here based your location."
                    rightElement={
                        <TimezoneSelect value={preferences.timezone} onChange={(timezone: string) =>
                            onChange("timezone", timezone)
                        }>
                            <Button>{preferences.timezone}</Button>
                        </TimezoneSelect>
                    }
                /> */}

                {/* <SettingRow
                    title="Start week on Monday"
                    description="If enabled the week's first day will always be Monday."
                    last
                    rightElement={
                        <Switch
                            checked={preferences.forceWeekMonday}
                            onChange={this.handleToggleForceMonday}
                        />
                    }
                /> */}
            </div>
        );
    }

    private getDateLocaleLabel = () => {
        if (DateLocales[this.props.preferences.dateLocale]) return this.props.preferences.dateLocale;
        for (const lng in DateLocales) {
            if (lng.includes(this.props.preferences.dateLocale)) {
                return lng;
            }
        }

        return "en";
    };

    private renderDateLocaleSelector = () => {
        const dateLocale = this.props.preferences.dateLocale;

        return (
            <Menu style={{ maxHeight: 250, overflow: "auto" }}>
                {Object.keys(DateLocales).map((lng: string) => {
                    return (
                        <MenuItem
                            key={lng}
                            icon={dateLocale === lng ? "tick" : "blank"}
                            text={DateLocales[lng]}
                            onClick={() => this.handleDateLocaleChange(lng)}
                        />
                    );
                })}
            </Menu>
        );
    };

    private handleRestartApp = () => {
        window.location.reload();
    };

    private relaunchMessage = () => {
        window.toaster.show({
            message: "Relaunch app to fully apply settings.",
            intent: Intent.SUCCESS,
            icon: "refresh",
            timeout: 0,
            action: {
                text: "Reload",
                onClick: () => this.handleRestartApp(),
            },
        });
    };

    private handleDateLocaleChange = async (locale: string) => {
        this.props.onChange("dateLocale", locale);
        await setDateFnsLocale(locale);
        this.relaunchMessage();
    };

    private handleToggleForceMonday = () => {
        this.props.onChange("forceWeekMonday", !this.props.preferences.forceWeekMonday);
        this.relaunchMessage();
    };
}
