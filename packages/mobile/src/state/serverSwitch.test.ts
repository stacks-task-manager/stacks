import { describe, expect, it, vi } from "vitest";
import { switchServerUrl } from "./serverSwitch";

describe("switchServerUrl", () => {
    it("allows a loopback HTTP server in development when switching hosts", async () => {
        vi.stubGlobal("__DEV__", true);
        try {
            const persistServerUrl = vi.fn();
            await expect(
                switchServerUrl("http://localhost:3002", "http://localhost:3000", {
                    clearCredentials: vi.fn(async () => undefined),
                    clearIdentity: vi.fn(),
                    clearCache: vi.fn(),
                    persistServerUrl,
                    setServerUrl: vi.fn(),
                })
            ).resolves.toBe(true);
            expect(persistServerUrl).toHaveBeenCalledWith("http://localhost:3002");
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("clears credentials and tenant state before persisting a changed server", async () => {
        const calls: string[] = [];
        const persistServerUrl = vi.fn(async (url: string) => {
            calls.push(`persist:${url}`);
        });
        const switched = await switchServerUrl("https://new.example/", "https://old.example", {
            clearCredentials: async () => {
                calls.push("credentials");
            },
            clearIdentity: () => calls.push("identity"),
            clearCache: () => calls.push("cache"),
            persistServerUrl,
            setServerUrl: url => calls.push(`state:${url}`),
        });

        expect(switched).toBe(true);
        expect(calls).toEqual([
            "credentials",
            "identity",
            "cache",
            "persist:https://new.example",
            "state:https://new.example",
        ]);
    });

    it("keeps credentials and cached state when the normalized server is unchanged", async () => {
        const clearCredentials = vi.fn();
        const clearIdentity = vi.fn();
        const clearCache = vi.fn();
        const persistServerUrl = vi.fn();
        const setServerUrl = vi.fn();

        await expect(
            switchServerUrl(" https://same.example/// ", "https://same.example", {
                clearCredentials,
                clearIdentity,
                clearCache,
                persistServerUrl,
                setServerUrl,
            })
        ).resolves.toBe(false);

        expect(clearCredentials).not.toHaveBeenCalled();
        expect(clearCache).not.toHaveBeenCalled();
        expect(persistServerUrl).not.toHaveBeenCalled();
        expect(setServerUrl).not.toHaveBeenCalled();
    });

    it("does not persist a new host when credential removal fails", async () => {
        const persistServerUrl = vi.fn();
        const clearIdentity = vi.fn();
        const clearCache = vi.fn();

        await expect(
            switchServerUrl("https://new.example", "https://old.example", {
                clearCredentials: async () => {
                    throw new Error("secure storage unavailable");
                },
                clearIdentity,
                clearCache,
                persistServerUrl,
                setServerUrl: vi.fn(),
            })
        ).rejects.toThrow("secure storage unavailable");

        expect(persistServerUrl).not.toHaveBeenCalled();
        expect(clearIdentity).toHaveBeenCalledOnce();
        expect(clearCache).toHaveBeenCalledOnce();
    });
});
