// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { getServerUrl } from "../config/server";
import * as SecureStore from "expo-secure-store";

import { SECURE_KEYS } from "../config/keys";

let onUnauthorized: (() => void | Promise<void>) | null = null;

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null) {
    onUnauthorized = handler;
}

export const api = axios.create({
    timeout: 60_000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const base = await getServerUrl();
    if (!base) {
        throw new Error("API requests must target the configured server");
    }

    const targetUrl = new URL(config.url ?? "", `${base}/`);
    if (targetUrl.origin !== new URL(base).origin) {
        throw new Error("API requests must target the configured server");
    }

    const [token, tokenServerUrl] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.authToken),
        SecureStore.getItemAsync(SECURE_KEYS.authTokenServerUrl),
    ]);
    // SecureStore reads can yield while the user switches servers and signs in.
    // Never combine the first URL snapshot with credentials from a later identity.
    if ((await getServerUrl()) !== base || (token && tokenServerUrl !== base)) {
        throw new Error("API requests must target the configured server");
    }

    config.baseURL = base;
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    res => res,
    async (error: AxiosError) => {
        const status = error.response?.status;
        if (status === 401 && onUnauthorized) {
            await onUnauthorized();
        }
        return Promise.reject(error);
    }
);

/** Unauthenticated request for server URL check (e.g. `GET /ping`). */
export async function pingServer(baseUrl: string): Promise<void> {
    const url = baseUrl.replace(/\/+$/, "");
    await axios.get(`${url}/ping`, { timeout: 10_000 });
}
