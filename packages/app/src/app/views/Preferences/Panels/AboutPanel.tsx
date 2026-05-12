// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import classnames from "classnames";

import { IPanelInterface } from ".";
import { ReactComponent as Icon } from "app/icons/icon.svg";
import { Classes } from "@blueprintjs/core";
import { Grid } from "app/components/common";
import { APP_PACKAGE_VERSION } from "appPackageVersion";

type AboutPanelState = {
    serverVersion: string | undefined;
};

export class AboutPanel extends React.Component<IPanelInterface, AboutPanelState> {
    state: AboutPanelState = { serverVersion: undefined };

    componentDidMount(): void {
        fetch("/health")
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then((body: { version?: unknown }) => {
                if (typeof body.version === "string") {
                    this.setState({ serverVersion: body.version });
                }
            })
            .catch(() => {
                /* keep serverVersion undefined */
            });
    }

    render() {
        const appVersion = APP_PACKAGE_VERSION;
        const { serverVersion } = this.state;

        return (
            <div className={classnames(["preference-panel", "about-panel"])}>
                <div className="icon">
                    <Icon />
                </div>

                <h3 className={Classes.HEADING}>Stacks</h3>
                <p>
                    <strong>
                        App {appVersion}
                        {serverVersion != null ? ` · Server ${serverVersion}` : null}
                    </strong>
                </p>
                <br />
                <br />
                <Grid align="center">
                    <a href="https://getstacksapp.com" target="_blank" rel="noopener noreferrer">
                        Website
                    </a>

                    <a href="https://getstacksapp.com/updates" target="_blank" rel="noopener noreferrer">
                        What&apos;s new
                    </a>

                    <a href="https://discussions.getstacksapp.com/" target="_blank" rel="noopener noreferrer">
                        Start a discussion or report an issue
                    </a>
                </Grid>
            </div>
        );
    }
}
