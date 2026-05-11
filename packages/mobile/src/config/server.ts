// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as SecureStore from "expo-secure-store";

import { SECURE_KEYS } from "./keys";

export function normalizeBaseUrl(raw: string): string {
    const t = raw.trim().replace(/\/+$/, "");
    return t;
}

export async function getServerUrl(): Promise<string | null> {
    const v = await SecureStore.getItemAsync(SECURE_KEYS.serverUrl);
    return v ? normalizeBaseUrl(v) : null;
}

export async function setServerUrl(url: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_KEYS.serverUrl, normalizeBaseUrl(url));
}

export async function clearServerUrl(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_KEYS.serverUrl);
}
