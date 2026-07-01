// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { sign } from "hono/jwt";
import { createRequire } from "module";
import { getJwtSecret } from "../config/secrets";
import { serverPackageVersion } from "../packageVersions";
import { requestContext } from "../services/requestContext";

type McpToolClient = {
    callTool: (toolName: string, input: unknown) => Promise<unknown>;
    close: () => Promise<void>;
};

function envTrim(name: string): string {
    const v = process.env[name];
    return typeof v === "string" ? v.trim() : "";
}

async function createInternalAuthToken(): Promise<string> {
    const userId = (requestContext.getCurrentUser() as unknown as { id: string }).id;
    const payload = {
        uid: userId,
        exp: Math.floor(Date.now() / 1000) + 60,
    };
    return await sign(payload, getJwtSecret());
}

function parseToolResultText(content: unknown): unknown {
    if (!Array.isArray(content)) {
        return null;
    }
    for (const item of content) {
        if (item && typeof item === "object" && (item as { type?: unknown }).type === "text") {
            const text = (item as { text?: unknown }).text;
            if (typeof text !== "string") {
                continue;
            }
            try {
                return JSON.parse(text);
            } catch {
                return text;
            }
        }
    }
    return null;
}

export async function createMcpToolClient(): Promise<McpToolClient> {
    const require = createRequire(import.meta.url);
    const { Client } = require("@modelcontextprotocol/sdk/client") as {
        Client: new (info: { name: string; version: string }) => {
            connect: (transport: unknown) => Promise<void>;
            callTool: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<{ content: unknown }>;
        };
    };
    const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp") as {
        StreamableHTTPClientTransport: new (url: URL, opts?: { requestInit?: RequestInit }) => {
            close: () => Promise<void>;
        };
    };

    const url = envTrim("AI_MCP_URL") || `http://localhost:${process.env.APP_PORT ?? 3000}/api/mcp`;
    const token = await createInternalAuthToken();

    const transport = new StreamableHTTPClientTransport(new URL(url), {
        requestInit: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    const client = new Client({
        name: "stacks-ai-chat",
        version: serverPackageVersion,
    });

    await client.connect(transport);

    return {
        callTool: async (toolName, input) => {
            const result = await client.callTool({
                name: toolName,
                arguments: input as Record<string, unknown>,
            });
            return parseToolResultText(result.content);
        },
        close: async () => {
            await transport.close();
        },
    };
}
