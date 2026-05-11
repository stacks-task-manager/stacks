// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { setUnauthorizedHandler } from "../api/client";
import { loginRequest } from "../api/endpoints";
import { SECURE_KEYS } from "../config/keys";
import { getServerUrl, normalizeBaseUrl, setServerUrl as persistServerUrl } from "../config/server";
import { queryClient } from "./queryClient";

type AuthContextValue = {
    isReady: boolean;
    serverUrl: string | null;
    token: string | null;
    userId: string | null;
    setServerUrl: (url: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, onUnauthorized }: { children: React.ReactNode; onUnauthorized: () => void }) {
    const [isReady, setIsReady] = useState(false);
    const [serverUrl, setServerUrlState] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const logout = useCallback(async () => {
        await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
        await SecureStore.deleteItemAsync(SECURE_KEYS.userId);
        setToken(null);
        setUserId(null);
        queryClient.clear();
        onUnauthorized();
    }, [onUnauthorized]);

    useEffect(() => {
        setUnauthorizedHandler(async () => {
            await SecureStore.deleteItemAsync(SECURE_KEYS.authToken);
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
                const [url, tok, uid] = await Promise.all([
                    getServerUrl(),
                    SecureStore.getItemAsync(SECURE_KEYS.authToken),
                    SecureStore.getItemAsync(SECURE_KEYS.userId),
                ]);
                if (cancelled) return;
                setServerUrlState(url);
                setToken(tok);
                setUserId(uid);
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const setServerUrl = useCallback(async (url: string) => {
        const n = normalizeBaseUrl(url);
        await persistServerUrl(n);
        setServerUrlState(n);
    }, []);

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await loginRequest(email, password);
            await SecureStore.setItemAsync(SECURE_KEYS.authToken, res.token);
            await SecureStore.setItemAsync(SECURE_KEYS.userId, res.user);
            setToken(res.token);
            setUserId(res.user);
        },
        []
    );

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
