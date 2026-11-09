import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { configureWebSocketPayloadLimit, MAX_WEBSOCKET_MESSAGE_BYTES } from "../socket";

const require_ = createRequire(import.meta.url);
const { WebSocket, WebSocketServer } = require_("ws") as any;

describe("WebSocket transport payload limit", () => {
    let server: ReturnType<typeof createServer> | undefined;
    let wss: any;
    let client: any;

    afterEach(async () => {
        client?.terminate();
        if (wss) await new Promise<void>(resolve => wss.close(() => resolve()));
        if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
        client = undefined;
        wss = undefined;
        server = undefined;
    });

    async function openBoundedSocket() {
        server = createServer();
        wss = new WebSocketServer({ noServer: true });
        configureWebSocketPayloadLimit(wss);
        wss.on("connection", (socket: any) => {
            socket.on("message", () => undefined);
            socket.on("error", () => undefined);
        });
        server.on("upgrade", (request, socket, head) => {
            wss.handleUpgrade(request, socket, head, (websocket: any) =>
                wss.emit("connection", websocket, request)
            );
        });
        await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
        const address = server.address() as { port: number };
        client = new WebSocket(`ws://127.0.0.1:${address.port}`);
        await new Promise<void>((resolve, reject) => {
            client.once("open", resolve);
            client.once("error", reject);
        });
        return client;
    }

    it("rejects oversized fragmented messages at the transport boundary", async () => {
        const socket = await openBoundedSocket();
        const closed = new Promise<number>(resolve => socket.once("close", (code: number) => resolve(code)));
        socket._sender.send(Buffer.alloc(140 * 1024), { fin: false, mask: true, opcode: 2 }, () => {
            socket._sender.send(Buffer.alloc(140 * 1024), { fin: true, mask: true, opcode: 0 });
        });

        await expect(closed).resolves.toBe(1009);
    });

    it("rejects oversized binary messages at the transport boundary", async () => {
        const socket = await openBoundedSocket();
        expect(wss.options.maxPayload).toBe(MAX_WEBSOCKET_MESSAGE_BYTES);
        const closed = new Promise<number>(resolve => socket.once("close", (code: number) => resolve(code)));
        socket.send(Buffer.alloc(MAX_WEBSOCKET_MESSAGE_BYTES + 1), { binary: true });

        await expect(closed).resolves.toBe(1009);
    });
});
