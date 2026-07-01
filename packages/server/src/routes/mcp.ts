// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp";
import { AI_TOOL_REGISTRY } from "../ai/toolRegistry";
import { serverPackageVersion } from "../packageVersions";

const TOOL_NAMES = new Set<string>(["getTask", "createTask", "listStacks", "createStack", "updateStack"]);

const mcpServer = new McpServer({
    name: "stacks-mcp",
    version: serverPackageVersion,
});

for (const def of AI_TOOL_REGISTRY) {
    if (!TOOL_NAMES.has(def.name)) {
        continue;
    }
    (mcpServer as any).registerTool(
        def.name,
        {
            description: def.description,
            inputSchema: def.inputSchema as any,
        },
        async (args: unknown) => {
            const output = await def.execute(args as never);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(output ?? null),
                    },
                ],
            };
        }
    );
}

const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
});

let connectOnce: Promise<void> | null = null;
async function ensureConnected() {
    if (!connectOnce) {
        connectOnce = mcpServer.connect(transport);
    }
    await connectOnce;
}

const mcp = new Hono();

mcp.all("*", async c => {
    await ensureConnected();
    return await transport.handleRequest(c.req.raw);
});

export default mcp;
