// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import classnames from "classnames";
import Log from "app/utils/log";
import { IPanelInterface } from ".";
import { ReactComponent as DarkTheme } from "app/icons/dark-theme.svg";
import { ReactComponent as LightTheme } from "app/icons/light-theme.svg";

export class ThemesPanel extends React.Component<IPanelInterface> {
    render() {
        Log.info("[Component][ThemesPanel]", "render");
        const { preferences, onChange } = this.props;

        return (
            <div className="preference-panel preference-panel-center">
                <div>
                    <p style={{ textAlign: "center" }}>
                        {translate("Choose either the light or dark theme for the Stacks app")}
                    </p>
                    <div className="themes">
                        <div
                            onClick={() => onChange("darkMode", false)}
                            className={classnames("light-theme", {
                                active: !preferences.darkMode,
                            })}
                        >
                            <LightTheme />
                        </div>
                        <div
                            onClick={() => onChange("darkMode", true)}
                            className={classnames("dark-theme", {
                                active: preferences.darkMode,
                            })}
                        >
                            <DarkTheme />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
