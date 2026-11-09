// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { setUnauthorizedHandler } from "../api/client";
import { loginRequest, logoutRequest } from "../api/endpoints";
import { SECURE_KEYS } from "../config/keys";
import { getServerUrl, setServerUrl as persistServerUrl } from "../config/server";
import { queryClient } from "./queryClient";
import { switchServerUrl } from "./serverSwitch";

type AuthContextValue = {
    isReady: boolean;
    serverUrl: string | null;
    token: string | null;
    userId: string | null;
    setServerUrl: (url: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    /** Returns whether the server accepted the revocation. */
    logout: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
    children,
    onUnauthorized,
}: {
    children: React.ReactNode;
    onUnauthorized: () => void;
}) {
    const [isReady, setIsReady] = useState(false);
    const [serverUrl, setServerUrlState] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const logout = useCallback(async () => {
        // Ask the server first, but never let a failed request keep us signed in.
        let serverAccepted = false;
        try {
            await logoutRequest();
            serverAccepted = true;
        } catch {
            serverAccepted = false;
        }

        await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
        await SecureStore.deleteItemAsync(SECURE_KEYS.authTokenServerUrl);
        await SecureStore.deleteItemAsync(SECURE_KEYS.userId);
        setToken(null);
        setUserId(null);
        queryClient.clear();
        onUnauthorized();
        return serverAccepted;
    }, [onUnauthorized]);

    useEffect(() => {
        // Sessions expire absolutely (seven days, no refresh), so a 401 means the
        // stored bearer is no longer usable: drop it and make the user sign in again.
        setUnauthorizedHandler(async () => {
            await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
            await SecureStore.deleteItemAsync(SECURE_KEYS.authTokenServerUrl);
            await SecureStore.deleteItemAsync(SECURE_KEYS.userId);
            setToken(null);
            setUserId(null);
            queryClient.clear();
            onUnauthorized();
        });
        return () => setUnauthorizedHandler(null);
    }, [onUnauthorized]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [url, tok, tokenServerUrl, uid] = await Promise.all([
                    getServerUrl(),
                    SecureStore.getItemAsync(SECURE_KEYS.authToken),
                    SecureStore.getItemAsync(SECURE_KEYS.authTokenServerUrl),
                    SecureStore.getItemAsync(SECURE_KEYS.userId),
                ]);
                if (cancelled) return;
                setServerUrlState(url);
                if (tok && tokenServerUrl !== url) {
                    await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
                    await SecureStore.deleteItemAsync(SECURE_KEYS.authTokenServerUrl);
                    await SecureStore.deleteItemAsync(SECURE_KEYS.userId);
                    setToken(null);
                    setUserId(null);
                } else {
                    setToken(tok);
                    setUserId(uid);
                }
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const setServerUrl = useCallback(
        async (url: string) => {
            await switchServerUrl(url, serverUrl, {
                clearCredentials: async () => {
                    await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
                    await SecureStore.deleteItemAsync(SECURE_KEYS.authTokenServerUrl);
                    await SecureStore.deleteItemAsync(SECURE_KEYS.userId);
                },
                clearIdentity: () => {
                    setToken(null);
                    setUserId(null);
                    onUnauthorized();
                },
                clearCache: () => queryClient.clear(),
                persistServerUrl,
                setServerUrl: setServerUrlState,
                allowInsecureLocal: typeof __DEV__ !== "undefined" && __DEV__,
            });
        },
        [serverUrl, onUnauthorized]
    );

    const login = useCallback(async (email: string, password: string) => {
        const loginServerUrl = await getServerUrl();
        if (!loginServerUrl) throw new Error("API requests must target the configured server");
        const res = await loginRequest(email, password);
        if ((await getServerUrl()) !== loginServerUrl) {
            throw new Error("Server changed while signing in; please try again");
        }
        await SecureStore.setItemAsync(SECURE_KEYS.authTokenServerUrl, loginServerUrl);
        await SecureStore.setItemAsync(SECURE_KEYS.authToken, res.token);
        if ((await getServerUrl()) !== loginServerUrl) {
            await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
            await SecureStore.deleteItemAsync(SECURE_KEYS.authTokenServerUrl);
            throw new Error("Server changed while signing in; please try again");
        }
        await SecureStore.setItemAsync(SECURE_KEYS.userId, res.user);
        setToken(res.token);
        setUserId(res.user);
    }, []);

    const value = useMemo(
        () => ({
            isReady,
            serverUrl,
            token,
            userId,
            setServerUrl,
            login,
            logout,
        }),
        [isReady, serverUrl, token, userId, setServerUrl, login, logout]
    );

    return <AuthContext.Provider value={value as AuthContextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
