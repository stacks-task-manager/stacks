// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Router hooks and selectors.
 */
import { IBackgroundLocationState } from "@stacks/types";
import { useCallback, useEffect, useState } from "react";
import { Location, NavigateOptions, useLocation } from "react-router-dom";
import { publish } from "./event";

export const APP_BASENAME = "/app";

type WindowRouteSnapshot = {
    pathname: string;
    search: string;
    hash: string;
};

function stripAppBasename(pathname: string): string {
    if (!pathname || pathname === APP_BASENAME) {
        return "/";
    }

    if (pathname.startsWith(`${APP_BASENAME}/`)) {
        return pathname.slice(APP_BASENAME.length) || "/";
    }

    return pathname;
}

function getLegacyHashSnapshot(): WindowRouteSnapshot | null {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw.startsWith("/")) {
        return null;
    }

    const [pathname, search = ""] = raw.split("?");
    return {
        pathname: pathname || "/",
        search: search ? `?${search}` : "",
        hash: "",
    };
}

function getCurrentWindowRouteSnapshot(): WindowRouteSnapshot {
    const legacyHash = getLegacyHashSnapshot();
    if (legacyHash) {
        return legacyHash;
    }

    return {
        pathname: stripAppBasename(window.location.pathname || "/") || "/",
        search: window.location.search || "",
        hash: window.location.hash || "",
    };
}

/** Query string for the current app route (includes leading `?`). */
export function getHashSearch(): string {
    return getCurrentWindowRouteSnapshot().search;
}

/**
 * Converts a legacy `#/route` URL into the BrowserRouter `/app/route` shape before React boots.
 */
export function normalizeLegacyHashRoute(): void {
    const legacyHash = getLegacyHashSnapshot();
    if (!legacyHash) {
        return;
    }

    const nextUrl = `${APP_BASENAME}${legacyHash.pathname}${legacyHash.search}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
        window.history.replaceState(window.history.state, "", nextUrl);
    }
}

/**
 * Background route for task modal overlay — reads the address bar synchronously (no `useLocation` subscription).
 */
export function snapshotTaskModalBackground(): {
    pathname: string;
    search: string;
    hash: string;
    state: null;
} {
    const snapshot = getCurrentWindowRouteSnapshot();
    return {
        pathname: snapshot.pathname,
        search: snapshot.search,
        hash: snapshot.hash,
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

/** Current app route path only (no `?query`) — kept under the old name for compatibility. */
export function getHashPathname(): string {
    return getCurrentWindowRouteSnapshot().pathname;
}

/** `/project/:projectId` or `/project/:projectId/:taskId` from the current app URL. */
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
