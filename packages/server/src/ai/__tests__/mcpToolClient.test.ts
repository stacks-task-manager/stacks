// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { createInternalAuthToken, createMcpToolClient } from "../mcpToolClient";
import { verify } from "hono/jwt";
import { getJwtSecret } from "../../config/secrets";
import { requestContext } from "../../services/requestContext";

describe("internal MCP authentication", () => {
    it("fails closed when there is no authenticated session id in request context", async () => {
        await expect(
            requestContext.run(
                {
                    user: { id: "user-1", tenant: "tenant-1" } as any,
                    role: { id: "role-1", title: "User" } as any,
                    instanceId: "test",
                    requestId: "request-1",
                    timestamp: Date.now(),
                },
                () => createMcpToolClient()
            )
        ).rejects.toThrow("Authenticated session context is required for internal MCP calls");
    });

    it("signs MCP requests with the session supplied by the trusted request context", async () => {
        const claims = await requestContext.run(
            {
                user: { id: "user-1", tenant: "tenant-1" } as any,
                role: { id: "role-1", title: "User" } as any,
                sid: "ws-session-1",
                instanceId: "test",
                requestId: "request-1",
                timestamp: Date.now(),
            },
            async () => verify(await createInternalAuthToken(), getJwtSecret(), "HS256")
        );

        expect(claims).toMatchObject({ uid: "user-1", sid: "ws-session-1" });
    });
});
