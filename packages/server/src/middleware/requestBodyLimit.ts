// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { MiddlewareHandler } from "hono";

const DEFAULT_BODY_LIMIT = 1_048_576;
const MCP_BODY_LIMIT = 262_144;
const UPLOAD_PATH = "/api/files/upload";
const MCP_PATH = "/api/mcp";

function bodyLimitForPath(path: string): number | undefined {
    if (path === UPLOAD_PATH) return undefined;
    if (path === MCP_PATH || path.startsWith(`${MCP_PATH}/`)) return MCP_BODY_LIMIT;
    return DEFAULT_BODY_LIMIT;
}

/** Read and count actual bytes before any route parser can materialize the body. */
export const requestBodyLimit: MiddlewareHandler = async (c, next) => {
    const raw = c.req.raw;
    if (!raw.body) return next();
    const maxBytes = bodyLimitForPath(c.req.path);
    if (maxBytes === undefined) return next();

    const contentLength = raw.headers.get("content-length");
    if (contentLength !== null) {
        if (!/^\d+$/.test(contentLength)) {
            void raw.body.cancel().catch(() => undefined);
            return c.text("Invalid request body", 400);
        }
        if (Number(contentLength) > maxBytes) {
            void raw.body.cancel().catch(() => undefined);
            return c.text("Payload Too Large", 413);
        }
    }

    const reader = raw.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            size += value.byteLength;
            if (size > maxBytes) {
                void reader.cancel().catch(() => undefined);
                return c.text("Payload Too Large", 413);
            }
            chunks.push(value);
        }
    } catch {
        void reader.cancel().catch(() => undefined);
        return c.text("Invalid request body", 400);
    } finally {
        reader.releaseLock();
    }

    const headers = new Headers(raw.headers);
    headers.delete("content-length");
    c.req.raw = new Request(raw, {
        headers,
        body: new ReadableStream({
            start(controller) {
                for (const chunk of chunks) controller.enqueue(chunk);
                controller.close();
            },
        }),
        duplex: "half",
    } as RequestInit & { duplex: "half" });
    return next();
};
