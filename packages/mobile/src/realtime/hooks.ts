// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useEffect } from "react";
import { POLLINGTYPE, type IUpdate } from "@stacks/types";

import { queryClient } from "../state/queryClient";
import { useRealtime } from "./RealtimeContext";

/**
 * Subscribe to real-time updates for a single POLLINGTYPE while the component
 * is mounted. Mirrors the web `useRealtimeUpdates` hook.
 */
export function useRealtimeUpdates(section: POLLINGTYPE, callback: (update: IUpdate) => void): void {
    const { poller } = useRealtime();
    useEffect(() => {
        if (!poller) return;
        const unsubscribe = poller.on(section, callback);
        return unsubscribe;
    }, [poller, section, callback]);
}

/**
 * Mirrors the web `useUpdates` hook: listens to every POLLINGTYPE the mobile
 * client cares about and invalidates the relevant React Query keys. Mount
 * this exactly once under the authenticated tree.
 */
export function useUpdates(): void {
    useRealtimeUpdates(POLLINGTYPE.DOCUMENTS, () => {
        void queryClient.invalidateQueries({ queryKey: ["documents"] });
        void queryClient.invalidateQueries({ queryKey: ["inbox-project"] });
    });

    useRealtimeUpdates(POLLINGTYPE.DOCUMENT, () => {
        void queryClient.invalidateQueries({ queryKey: ["documents"] });
    });

    useRealtimeUpdates(POLLINGTYPE.PROJECT, update => {
        void queryClient.invalidateQueries({ queryKey: ["project", update.record] });
        void queryClient.invalidateQueries({ queryKey: ["stacks", update.record] });
        void queryClient.invalidateQueries({ queryKey: ["tasks", update.record] });
    });

    useRealtimeUpdates(POLLINGTYPE.STACK, update => {
        const projectId = update.parent;
        if (projectId) {
            void queryClient.invalidateQueries({ queryKey: ["stacks", projectId] });
            void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        } else {
            void queryClient.invalidateQueries({ queryKey: ["stacks"] });
            void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
    });

    useRealtimeUpdates(POLLINGTYPE.TASK, update => {
        void queryClient.invalidateQueries({ queryKey: ["task", update.record] });
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        void queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    });

    useRealtimeUpdates(POLLINGTYPE.NOTEPAD, update => {
        void queryClient.invalidateQueries({ queryKey: ["notepad", update.record] });
    });

    useRealtimeUpdates(POLLINGTYPE.PEOPLE, () => {
        void queryClient.invalidateQueries({ queryKey: ["people"] });
    });

    useRealtimeUpdates(POLLINGTYPE.PERSON, update => {
        void queryClient.invalidateQueries({ queryKey: ["person", update.record] });
    });

    useRealtimeUpdates(POLLINGTYPE.COMPANIES, () => {
        void queryClient.invalidateQueries({ queryKey: ["companies"] });
    });

    useRealtimeUpdates(POLLINGTYPE.COMPANY, update => {
        void queryClient.invalidateQueries({ queryKey: ["companies"] });
        void queryClient.invalidateQueries({ queryKey: ["company", update.record] });
    });
}
