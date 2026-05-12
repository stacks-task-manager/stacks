// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent, Portal, Tooltip } from "@blueprintjs/core";
import { Dot } from "@blueprintjs/icons";
import { BlankSlate, Icon } from "app/components/common";
import { BrowserState, useBrowserState } from "app/hooks";
import React, { useEffect, useMemo, useRef } from "react";
import { useState } from "react";

interface IConnectionStatus {
    label: string;
    color: string;
}

export const ConnectionStatus = () => {
    const [isConnected, setIsConnected] = useState<boolean | undefined>(false);
    const [showAlert, setShowAlert] = useState<boolean>(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const unsubscribe = window.updatePoller.onChange((connectionStatus) => {
            if (connectionStatus.isConnected) {
                if (isConnected) {
                    return;
                }

                setIsConnected(() => true);
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                setShowAlert(() => false);
            } else if (connectionStatus.isConnecting) {
            } else if (connectionStatus.isDisconnected) {
                if (!timerRef.current) {
                    timerRef.current = setTimeout(() => {
                        setShowAlert(() => true);
                    }, 10000);
                }

                if (isConnected === false) {
                    return;
                }

                setIsConnected(() => false);
            }
        });

        return () => {
            unsubscribe();
        }
    }, []);

    const browserState = useBrowserState();

    const updateUserStatus = async (browserState: BrowserState) => {
        let status = 'online';
        if (browserState === 'idle') {
            status = 'idle';
        } else if (browserState === 'closed') {
            status = 'offline';
        }

        try {
            await window.updatePoller.sendMessage({
                type: 'user_status',
                status,
                timestamp: Date.now()
            });
        } catch (e) {
            //
        }
    }

    useEffect(() => {
        updateUserStatus(browserState);
    }, [browserState])

    const connectionStatus = useMemo(() => {
        const status: IConnectionStatus = {
            color: "orange",
            label: "Connecting...",
        };

        status.label = isConnected
            ? "Real-time events server connected"
            : "Real-time events server disconnected";
        status.color = isConnected ? "#4caf50" : "red";

        return status;
    }, [isConnected]);

    return (
        <>
            <Tooltip content={connectionStatus.label} placement="right">
                <Dot color={connectionStatus.color} />
            </Tooltip>
            {showAlert && (<Portal>
                <div id="connection-status-alert">
                    <BlankSlate
                        icon="wifi-off" title="Server not connected"
                        description="Please check your internet connection and try again. If this problem persists, please contact support."
                    >
                        <Button icon={<Icon icon="refresh-cw-01" />} intent={Intent.PRIMARY} onClick={() => window.location.reload()}>Click to refresh</Button>
                    </BlankSlate>
                </div>
            </Portal>)}
        </>
    );
};
