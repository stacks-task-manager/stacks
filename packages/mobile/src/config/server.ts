// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import * as SecureStore from "expo-secure-store";

import { SECURE_KEYS } from "./keys";
import { normalizeBaseUrl } from "./serverUrl";

export { normalizeBaseUrl } from "./serverUrl";

const allowInsecureLocal = typeof __DEV__ !== "undefined" && __DEV__;

export async function getServerUrl(): Promise<string | null> {
    const v = await SecureStore.getItemAsync(SECURE_KEYS.serverUrl);
    return v ? normalizeBaseUrl(v, allowInsecureLocal) : null;
}

export async function setServerUrl(url: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_KEYS.serverUrl, normalizeBaseUrl(url, allowInsecureLocal));
}

export async function clearServerUrl(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_KEYS.serverUrl);
}
