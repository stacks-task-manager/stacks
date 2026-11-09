// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Real socket harness: boots the WS registration seam on a local Node server at
 * an ephemeral port (never 3001) so tests can open real WS clients and observe
 * real event dispatch. Does not bootstrap the app, license, or NODE_ENV.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { registerSocket, registerSocketHandlers } from "../../src/routes/socket";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const WebSocketClient = require_("ws");

const HANDSHAKE_TIMEOUT_MS = 5000;
const TIMED_OUT = Symbol("timed out");

/**
 * Resolves a promise, or returns a timeout sentinel without leaving the timer running.
 */
const awaitWithTimeout = async (promise: Promise<any>, ms: number): Promise<any> => {
    let timer: any = null;
    const timeout = new Promise<any>(resolve => {
        timer = setTimeout(() => resolve(TIMED_OUT), ms);
    });
    const winner = await Promise.race([promise, timeout]);
    if (timer) {
        clearTimeout(timer);
    }
    return winner;
};

/**
 * Defaults to the real registration seam; tests can pass another registration
 * function (e.g. the test-mode wrapper) to prove the harness is not vacuous.
 */
/**
 * Polls a condition until it holds or the deadline passes; used by tests to wait
 * for real frames/stats without assuming delivery timing.
 */
const waitFor = async (check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (true) {
        if (await check()) {
            return true;
        }
        if (Date.now() >= deadline) {
            return false;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
};

export async function startSocketHarness(register: (app: Hono) => any = registerSocketHandlers): Promise<{
    port: number;
    request: (
        path: string,
        headers?: Record<string, string>
    ) => Promise<{ status: number; headers: Record<string, string>; body: string }>;
    openClient: (
        headers?: Record<string, string>
    ) => Promise<{ opened: boolean; client: any; frames: string[] }>;
    waitFor: (check: () => Promise<boolean>, timeoutMs?: number) => Promise<boolean>;
    close: () => Promise<void>;
}> {
    const app = new Hono();
    const injectWebSocket = register(app);

    let port = 0;
    let markBound: () => void = () => {};
    const bound = new Promise<string>(resolve => {
        markBound = () => resolve("bound");
    });

    const server = serve({ fetch: app.fetch, port: 0 }, info => {
        port = info.port;
        markBound();
    });
    injectWebSocket(server);

    const closeServer = () => new Promise<void>(resolve => server.close(resolve));

    if ((await awaitWithTimeout(bound, HANDSHAKE_TIMEOUT_MS)) !== "bound") {
        await closeServer();
        throw new Error("Socket harness failed to bind an ephemeral port");
    }

    const clients: any[] = [];

    const request = async (path: string, headers?: Record<string, string>) => {
        const response = await fetch(`http://localhost:${port}${path}`, { headers: headers ?? {} });
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of response.headers.entries()) {
            responseHeaders[key] = value;
        }
        return { status: response.status, headers: responseHeaders, body: await response.text() };
    };

    const openClient = async (
        headers?: Record<string, string>,
        options?: Record<string, any>,
        path: string = "/ws"
    ) => {
        const client = new WebSocketClient(`ws://localhost:${port}${path}`, {
            ...(options ?? {}),
            headers: headers ?? {},
        });
        clients.push(client);

        const frames: string[] = [];
        const closeCodes: number[] = [];
        client.on("message", (data: any) => {
            frames.push(typeof data === "string" ? data : Buffer.from(data).toString());
        });
        client.on("close", (code: any) => {
            closeCodes.push(Number(code));
        });

        const handshake = new Promise<string>(resolve => {
            client.once("open", () => resolve("open"));
            client.once("error", (error: any) => resolve(`error: ${error?.message ?? error}`));
            client.once("close", () => resolve("close"));
            client.once("unexpected-response", (_: any, response: any) =>
                resolve(`unexpected-response: ${response?.status ?? response?.statusCode ?? "unknown"}`)
            );
        });
        const outcome = await awaitWithTimeout(handshake, HANDSHAKE_TIMEOUT_MS);
        return { opened: outcome === "open", outcome, closeCodes, client, frames };
    };

    const close = async () => {
        for (const client of clients) {
            try {
                client.close();
            } catch {}
        }
        const cleanup = (app as any).cleanupWebSocket;
        if (cleanup) {
            cleanup();
        }
        await closeServer();
    };

    return {
        port,
        request,
        openClient,
        waitFor: (check, timeoutMs = HANDSHAKE_TIMEOUT_MS) => waitFor(check, timeoutMs),
        close,
    };
}
