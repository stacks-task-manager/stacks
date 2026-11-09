import { afterEach, describe, expect, test, vi } from "vitest";

const secureState = vi.hoisted(() => ({
    url: "https://old.example" as string | null,
    token: "old-host-token" as string | null,
    tokenServerUrl: "https://old.example" as string | null,
    tokenRead: undefined as (() => Promise<void>) | undefined,
}));

vi.mock("../config/server", () => ({
    getServerUrl: vi.fn(async () => secureState.url),
}));

vi.mock("expo-secure-store", () => ({
    getItemAsync: vi.fn(async (key: string) => {
        if (key === "stacks_auth_token") {
            await secureState.tokenRead?.();
            return secureState.token;
        }
        if (key === "stacks_auth_token_server_url") return secureState.tokenServerUrl;
        return null;
    }),
}));

import { api } from "./client";
import { switchServerUrl } from "../state/serverSwitch";

afterEach(() => {
    secureState.url = "https://old.example";
    secureState.token = "old-host-token";
    secureState.tokenServerUrl = "https://old.example";
    secureState.tokenRead = undefined;
});

describe("mobile API credentials across server switches", () => {
    test("rejects requests when there is no configured server", async () => {
        secureState.url = null;
        const adapter = vi.fn(async config => ({
            data: {},
            status: 200,
            statusText: "OK",
            headers: {},
            config,
        }));

        await expect(api.get("/api/private", { adapter: adapter as any })).rejects.toThrow(
            "API requests must target the configured server"
        );
        expect(adapter).not.toHaveBeenCalled();
    });

    test("rejects absolute requests to a different origin before attaching the stored token", async () => {
        const adapter = vi.fn(async config => ({
            data: {},
            status: 200,
            statusText: "OK",
            headers: {},
            config,
        }));

        await expect(
            api.get("https://attacker.example/collect", { adapter: adapter as any })
        ).rejects.toThrow("API requests must target the configured server");
        expect(adapter).not.toHaveBeenCalled();
    });

    test("does not send the old host token to the newly selected server", async () => {
        const observed: Array<{ baseURL?: string; authorization?: unknown }> = [];
        const request = () =>
            api.get("/private", {
                adapter: async config => {
                    observed.push({
                        baseURL: config.baseURL,
                        authorization: config.headers.Authorization,
                    });
                    return {
                        data: {},
                        status: 200,
                        statusText: "OK",
                        headers: {},
                        config,
                    };
                },
            });

        await request();
        await switchServerUrl("https://new.example", secureState.url, {
            clearCredentials: async () => {
                secureState.token = null;
            },
            clearIdentity: () => undefined,
            clearCache: () => undefined,
            persistServerUrl: async url => {
                secureState.url = url;
            },
            setServerUrl: url => {
                secureState.url = url;
            },
        });
        await request();

        expect(observed).toEqual([
            { baseURL: "https://old.example", authorization: "Bearer old-host-token" },
            { baseURL: "https://new.example", authorization: undefined },
        ]);
    });

    test("rejects an in-flight old-server request if a new server token is saved before dispatch", async () => {
        let releaseTokenRead!: () => void;
        secureState.tokenRead = () => new Promise<void>(resolve => (releaseTokenRead = resolve));
        const request = api.get("/private", {
            adapter: vi.fn(async config => ({
                data: {},
                status: 200,
                statusText: "OK",
                headers: {},
                config,
            })),
        });

        await vi.waitFor(() => expect(releaseTokenRead).toBeTypeOf("function"));
        secureState.url = "https://new.example";
        secureState.token = "new-host-token";
        secureState.tokenServerUrl = "https://new.example";
        releaseTokenRead();

        await expect(request).rejects.toThrow("API requests must target the configured server");
    });
});
