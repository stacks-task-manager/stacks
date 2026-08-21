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

/**
 * Strips the leading app basename prefix from a pathname, returning "/" for the root.
 * @param {string} pathname - The raw pathname to normalize.
 * @returns The pathname with the app basename removed, or "/" when empty or at the basename root.
 */
function stripAppBasename(pathname: string): string {
    if (!pathname || pathname === APP_BASENAME) {
        return "/";
    }

    if (pathname.startsWith(`${APP_BASENAME}/`)) {
        return pathname.slice(APP_BASENAME.length) || "/";
    }

    return pathname;
}

/**
 * Parses the current window location hash into a route snapshot if it is in legacy "#/..." form.
 * @returns A route snapshot built from the legacy hash, or null if the hash is not a legacy route.
 */
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

/**
 * Builds a route snapshot from the current browser URL, preferring a legacy hash route when present.
 * @returns The current route snapshot (pathname, search, hash).
 */
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

/**
 * The query string for the current app route, including the leading "?".
 * @returns The current route's query string (or "" when absent).
 */
export function getHashSearch(): string {
    return getCurrentWindowRouteSnapshot().search;
}

/**
 * Converts a legacy "#/route" URL into the BrowserRouter "/app/route" shape before React boots.
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
 * Background route for the task modal overlay, read synchronously from the address bar (no useLocation subscription).
 * @returns The current route snapshot with a null state.
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

/**
 * Builds a task-modal background snapshot from an existing Location object (same shape as snapshotTaskModalBackground).
 * @param {Pick<Location, "pathname" | "search" | "hash">} location - The Location to derive the snapshot from.
 * @returns The route snapshot with a null state.
 */
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

/**
 * Reads the navigate user state that React Router 6 stores in history.state.usr.
 * @returns The user state object, or undefined when not present.
 */
export function getRouterNavigateUserState(): unknown {
    if (typeof window === "undefined") return undefined;
    const s = window.history.state;
    if (s != null && typeof s === "object" && "usr" in s) {
        return (s as { usr: unknown }).usr;
    }
    return undefined;
}

/**
 * The backgroundLocation from the current history entry (e.g. the list view under an open task modal).
 * @returns The background location, or undefined when the current history entry has none.
 */
export function getTaskModalListBackgroundFromHistory():
    | IBackgroundLocationState["backgroundLocation"]
    | undefined {
    const usr = getRouterNavigateUserState();
    if (usr != null && typeof usr === "object" && "backgroundLocation" in usr) {
        const bg = (usr as IBackgroundLocationState).backgroundLocation;
        if (bg != null && typeof bg === "object" && "pathname" in bg) {
            return bg as IBackgroundLocationState["backgroundLocation"];
        }
    }
    return undefined;
}

/**
 * The current app route path only (no query string), kept under the old name for compatibility.
 * @returns The current route pathname.
 */
export function getHashPathname(): string {
    return getCurrentWindowRouteSnapshot().pathname;
}

/**
 * Extracts the project id from a "/project/:projectId" or "/project/:projectId/:taskId" app URL.
 * @returns The project id, or "" when the current URL is not a valid project route.
 */
export function getProjectIdFromHashPath(): string {
    const path = getHashPathname();
    const segments = path.split("/").filter(Boolean);
    if (segments[0] !== "project" || segments[1] == null || segments[1] === "") {
        return "";
    }
    return segments[1];
}

/**
 * Tracks the current record type derived from the first segment of the location pathname.
 * @returns The current record type string.
 */
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

/**
 * Returns a callback that publishes a navigation request to the given location.
 * @returns A function that takes a location string and optional navigate options and publishes a "navigate" event.
 */
export const useNav = () => {
    return useCallback((location: string, options?: NavigateOptions) => {
        publish("navigate", { location, options });
    }, []);
};

/**
 * Publishes a navigation request to the given location.
 * @param {string} location - The target location string.
 * @param {NavigateOptions} [options] - Optional react-router navigate options.
 */
export const nav = (location: string, options?: NavigateOptions) => {
    publish("navigate", { location, options });
};
