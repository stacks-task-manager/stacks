// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDebugServerApp, isDebugViewerAllowed } from "./debugServerApp";

const credential = "ephemeral-local-credential";
const readTurns = vi.fn(async () => []);
const clearTurns = vi.fn(async () => undefined);
const app = createDebugServerApp({
    credential,
    port: 3025,
    readTurns,
    clearTurns,
    renderIndex: () => "debug",
});
const authorization = `Basic ${Buffer.from(`stacks-debug:${credential}`).toString("base64")}`;
const request = (path: string, init: RequestInit = {}) =>
    app.request(path, {
        ...init,
        headers: { host: "127.0.0.1:3025", ...init.headers },
    });

describe("AI debug viewer access", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("requires the ephemeral credential for the page and API", async () => {
        expect((await request("/api/turns")).status).toBe(401);
        expect((await request("/")).status).toBe(401);
    });

    it("allows authenticated requests from the local origin", async () => {
        const response = await request("/api/turns", {
            headers: { authorization, origin: "http://127.0.0.1:3025" },
        });
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(readTurns).toHaveBeenCalledOnce();
    });

    it("rejects a wrong credential and attacker-controlled host or origin", async () => {
        const wrongAuth = `Basic ${Buffer.from("stacks-debug:wrong").toString("base64")}`;
        expect((await request("/api/turns", { headers: { authorization: wrongAuth } })).status).toBe(401);
        expect(
            (await request("/api/turns", { headers: { authorization, host: "attacker.example" } })).status
        ).toBe(403);
        expect(
            (
                await request("/api/turns", {
                    headers: { authorization, origin: "https://attacker.example" },
                })
            ).status
        ).toBe(403);
    });

    it("protects deletion with the same checks", async () => {
        expect((await request("/api/turns", { method: "DELETE" })).status).toBe(401);
        expect(clearTurns).not.toHaveBeenCalled();
        const response = await request("/api/turns", {
            method: "DELETE",
            headers: { authorization },
        });
        expect(response.status).toBe(200);
        expect(clearTurns).toHaveBeenCalledOnce();
    });

    it("refuses to start in production", () => {
        expect(isDebugViewerAllowed({ NODE_ENV: "production" })).toBe(false);
        expect(isDebugViewerAllowed({ NODE_ENV: "development" })).toBe(true);
    });
});
