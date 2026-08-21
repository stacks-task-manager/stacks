// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { AnchorButton, Button, Classes, Intent, NonIdealState } from "@blueprintjs/core";
import { Reset } from "@blueprintjs/icons";
import React, { ErrorInfo } from "react";
import axios from "axios";
import classNames from "classnames";

import Config from "config";
import { openInNewTab } from "app/utils/browser";
import Storage from "app/utils/storage";

interface IErrorBoundaryProps {
    children?: React.ReactNode;
}
interface IErrorBoundaryState {
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
    constructor(props: object) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Catch errors in any components below and re-render with error message
        this.setState(
            {
                error: error,
                errorInfo: errorInfo,
            },
            this.handleSendCrashLog
        );
        // You can also log error messages to an error reporting service here
    }

    render() {
        // Error path
        if (this.state.errorInfo) {
            return (
                <div id="error-boundary">
                    <NonIdealState
                        icon="error"
                        title={translate("Application crashed")}
                        description={
                            <div className="error-description">
                                <p>
                                    {translate(
                                        "The app encountered a problem Please use the Send Report button below to assist us in resolving this matter"
                                    )}
                                </p>
                                <p className={classNames(Classes.TEXT_SMALL, Classes.TEXT_MUTED)}>
                                    {translate(
                                        "Please keep in mind that none of your data has been compromised or lost"
                                    )}
                                </p>
                            </div>
                        }
                        action={
                            <Button intent={Intent.PRIMARY} onClick={this.handleSendError}>
                                {translate("Send report")}
                            </Button>
                        }
                    >
                        <AnchorButton
                            size="small"
                            variant="minimal"
                            intent={Intent.SUCCESS}
                            icon={<Reset size={10} />}
                            onClick={this.handleRestart}
                        >
                            {translate("Relaunch Stacks")}
                        </AnchorButton>
                    </NonIdealState>
                </div>
            );
        }

        // Normally, just render children
        return this.props.children;
    }

    private handleSendError = () => {
        if (Config.debug) return;
        if (!this.state.error) return;

        const errorData = {
            message: this.state.error.message,
            stack: this.state.error.stack,
            os: navigator.userAgent,
        };

        const mailtoUrl = `mailto:info@getstacksapp.com?subject=${encodeURIComponent(
            "App Error"
        )}&body=${encodeURIComponent(JSON.stringify(errorData))}`;
        openInNewTab(mailtoUrl);
    };

    private handleSendCrashLog = () => {
        if (Config.debug) return;
        if (!this.state.error) return;
        axios.post(
            "https://getstacksapp.com/crashes/",
            JSON.stringify({
                message: this.state.error.message,
                stack: this.state.error.stack,
                os: navigator.userAgent,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    };

    private handleRestart = () => {
        // clearing recents
        Storage.remove("recents");

        window.location.reload();
    };
}
