// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Router hooks and selectors.
 */
import { IBackgroundLocationState } from "@stacks/types";
import { useCallback, useEffect, useState } from "react";
import { Location, NavigateOptions, useLocation } from "react-router-dom";
import { publish } from "./event";

/** Query string inside the hash (includes leading `?`), for HashRouter URLs like `#/project/1?f=1`. */
export function getHashSearch(): string {
    const raw = window.location.hash.replace(/^#/, "");
    const q = raw.indexOf("?");
    return q === -1 ? "" : raw.slice(q);
}

/**
 * Background route for task modal overlay — reads the address bar synchronously (no `useLocation` subscription).
 * Supports HashRouter (`#/path?query`) and falls back to pathname/search on the rare non-hash URL.
 */
export function snapshotTaskModalBackground(): {
    pathname: string;
    search: string;
    hash: string;
    state: null;
} {
    const rawHash = window.location.hash.replace(/^#/, "");
    if (rawHash !== "") {
        const pathname = getHashPathname() || "/";
        return {
            pathname,
            search: getHashSearch(),
            hash: "",
            state: null,
        };
    }
    return {
        pathname: window.location.pathname || "/",
        search: window.location.search || "",
        hash: window.location.hash || "",
        state: null,
    };
}

/** For tests or call sites that already have a `Location` — same shape as {@link snapshotTaskModalBackground}. */
export function snapshotLocationForTaskModal(location: Pick<Location, "pathname" | "search" | "hash">): {
    pathname: string;
    search: string;
    hash: string;
    state: null;
} {
    return {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: null,
    };
}

/** React Router 6 stores `navigate(..., { state })` in `history.state.usr` (@remix-run/router). */
export function getRouterNavigateUserState(): unknown {
    if (typeof window === "undefined") return undefined;
    const s = window.history.state;
    if (s != null && typeof s === "object" && "usr" in s) {
        return (s as { usr: unknown }).usr;
    }
    return undefined;
}

/** `backgroundLocation` from the current history entry (e.g. list view under an open `/task/:id` modal). */
export function getTaskModalListBackgroundFromHistory(): IBackgroundLocationState["backgroundLocation"] | undefined {
    const usr = getRouterNavigateUserState();
    if (usr != null && typeof usr === "object" && "backgroundLocation" in usr) {
        const bg = (usr as IBackgroundLocationState).backgroundLocation;
        if (bg != null && typeof bg === "object" && "pathname" in bg) {
            return bg as IBackgroundLocationState["backgroundLocation"];
        }
    }
    return undefined;
}

/** Hash route path only (no `?query`) — needed before `matchPath` or `/`-split parsing. */
export function getHashPathname(): string {
    const raw = window.location.hash.replace(/^#/, "");
    const q = raw.indexOf("?");
    return q === -1 ? raw : raw.slice(0, q);
}

/** `/project/:projectId` or `/project/:projectId/:taskId` from the current hash. */
export function getProjectIdFromHashPath(): string {
    const path = getHashPathname();
    const segments = path.split("/").filter(Boolean);
    if (segments[0] !== "project" || segments[1] == null || segments[1] === "") {
        return "";
    }
    return segments[1];
}

export const useRecordType = () => {
    const location = useLocation();
    const [recordType, setRecordType] = useState(location.pathname.split("/")[1]);

    useEffect(() => {
        const type = location.pathname.split("/")[1];
        if (type !== recordType) {
            setRecordType(type);
        }
    }, [location.pathname]);

    return recordType;
};

export const useNav = () => {
    return useCallback((location: string, options?: NavigateOptions) => {
        publish("navigate", { location, options });
    }, []);
};

export const nav = (location: string, options?: NavigateOptions) => {
    publish("navigate", { location, options });
};
