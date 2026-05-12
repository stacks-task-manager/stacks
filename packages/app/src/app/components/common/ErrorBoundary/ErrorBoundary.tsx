// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { AnchorButton, Button, Intent, NonIdealState } from "@blueprintjs/core";
import { Reset } from "@blueprintjs/icons";
import React from "react";
import axios from "axios";

import Config from "config";
import Storage from "app/utils/storage";

interface IErrorBoundaryProps {
    children?: React.ReactNode;
}
interface IErrorBoundaryState {
    error: any;
    errorInfo: any;
}
export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
    constructor(props: object) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error: any, errorInfo: any) {
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
                                    {translate("The app encountered a problem Please use the Send Report button below to assist us in resolving this matter")}
                                </p>
                                <p className="bp4-text-small bp4-text-muted">
                                    {translate("Please keep in mind that none of your data has been compromised or lost")}
                                </p>
                            </div>
                        }
                        action={
                            <Button intent={Intent.PRIMARY} onClick={this.handleSendError}>
                                Send report
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
                            Relaunch Stacks
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

        const errorData = {
            message: this.state.error.message,
            stack: this.state.error.stack,
            os: navigator.userAgent,
        };

        const mailtoUrl = `mailto:info@getstacksapp.com?subject=App Error&body=${encodeURIComponent(JSON.stringify(errorData))}`;
        window.open(mailtoUrl, '_blank');
    };

    private handleSendCrashLog = () => {
        if (Config.debug) return;
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

    // private handleDevTools = () => {
    //     remote.getCurrentWindow().openDevTools();
    // };
}
