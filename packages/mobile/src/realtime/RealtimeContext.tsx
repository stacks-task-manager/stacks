// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../state/AuthContext";
import type { ConnectionStatus } from "./poller";
import { UpdatePoller } from "./poller";

type RealtimeContextValue = {
    poller: UpdatePoller | null;
    status: ConnectionStatus;
};

const RealtimeContext = createContext<RealtimeContextValue>({
    poller: null,
    status: { isConnected: false, isConnecting: false, isDisconnected: true },
});

/**
 * Lives inside the authenticated (app) tree. Owns exactly one `UpdatePoller`
 * for the current `(serverUrl, token)` pair; rebuilds it when either changes;
 * destroys it on logout or unmount.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const { serverUrl, token } = useAuth();
    const pollerRef = useRef<UpdatePoller | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>({
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
    });

    useEffect(() => {
        if (pollerRef.current) {
            pollerRef.current.destroy();
            pollerRef.current = null;
        }
        if (!serverUrl || !token) {
            setStatus({ isConnected: false, isConnecting: false, isDisconnected: true });
            return;
        }
        const p = new UpdatePoller(serverUrl, token);
        pollerRef.current = p;
        const unsub = p.onStatus(setStatus);
        return () => {
            unsub();
            p.destroy();
            if (pollerRef.current === p) {
                pollerRef.current = null;
            }
        };
    }, [serverUrl, token]);

    const value = useMemo<RealtimeContextValue>(
        () => ({ poller: pollerRef.current, status }),
        [status]
    );

    return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
    return useContext(RealtimeContext);
}
