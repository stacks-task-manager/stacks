// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Hono } from "hono";
import { createHash, timingSafeEqual } from "crypto";
import type { AiChatDebugTurn } from "./debugLog";

export type DebugServerDependencies = {
    credential: string;
    port: number;
    readTurns: (limit?: number) => Promise<AiChatDebugTurn[]>;
    clearTurns: () => Promise<void>;
    renderIndex: () => string;
};

export function isDebugViewerAllowed(env: NodeJS.ProcessEnv): boolean {
    return env.NODE_ENV !== "production";
}

export function createDebugServerApp(deps: DebugServerDependencies) {
    const app = new Hono();

    app.use("*", async (c, next) => {
        c.header("Cache-Control", "private, no-store");
        c.header("X-Content-Type-Options", "nosniff");
        const host = c.req.header("host") ?? "";
        const allowedHosts = new Set([`127.0.0.1:${deps.port}`, `localhost:${deps.port}`]);
        if (!allowedHosts.has(host.toLowerCase())) return c.text("Forbidden", 403);

        const origin = c.req.header("origin");
        if (origin && origin !== `http://${host.toLowerCase()}`) return c.text("Forbidden", 403);

        const authorization = c.req.header("authorization") ?? "";
        const [scheme, encoded] = authorization.split(" ");
        let supplied = "";
        try {
            if (scheme?.toLowerCase() === "basic" && encoded && !encoded.includes(" ")) {
                supplied = Buffer.from(encoded, "base64").toString("utf8");
            }
        } catch {
            supplied = "";
        }
        const expected = `stacks-debug:${deps.credential}`;
        const suppliedDigest = createHash("sha256").update(supplied).digest();
        const expectedDigest = createHash("sha256").update(expected).digest();
        if (!timingSafeEqual(suppliedDigest, expectedDigest)) {
            return c.text("Authentication required", 401, {
                "WWW-Authenticate": 'Basic realm="Stacks AI debug", charset="UTF-8"',
                "Cache-Control": "no-store",
            });
        }
        await next();
    });

    app.get("/", c => c.html(deps.renderIndex()));

    app.get("/api/turns", async c => {
        const limit = Number(c.req.query("limit") ?? 200);
        const turns = await deps.readTurns(Number.isFinite(limit) ? limit : 200);
        return c.json(
            turns.map(turn => ({
                id: turn.id,
                startedAt: turn.startedAt,
                finishedAt: turn.finishedAt,
                status: turn.status,
                modelId: turn.modelId,
                user: turn.user,
                message: turn.request.newUserMessage,
                topics: turn.promptSelection?.topics ?? [],
                tools: turn.tools.map(tool => ({
                    toolName: tool.toolName,
                    success: tool.success,
                    timestamp: tool.timestamp,
                })),
                responsePreview: (turn.responseText ?? turn.error ?? "").slice(0, 240),
            }))
        );
    });

    app.get("/api/turns/:id", async c => {
        const turns = await deps.readTurns();
        const turn = turns.find(candidate => candidate.id === c.req.param("id"));
        if (!turn) return c.json({ error: "Turn not found" }, 404);
        return c.json(turn);
    });

    app.delete("/api/turns", async c => {
        await deps.clearTurns();
        return c.json({ ok: true });
    });

    return app;
}
