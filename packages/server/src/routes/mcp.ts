// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { AI_TOOL_REGISTRY, MCP_AI_TOOL_NAMES } from "../ai/toolRegistry";
import { serverPackageVersion } from "../packageVersions";
import { MCP_INSTRUCTIONS, mcpToolAnnotations } from "../ai/mcpGuidance";

function createMcpServer() {
    const mcpServer = new McpServer(
        {
            name: "stacks-mcp",
            version: serverPackageVersion,
        },
        { instructions: MCP_INSTRUCTIONS }
    );

    for (const def of AI_TOOL_REGISTRY) {
        if (!MCP_AI_TOOL_NAMES.has(def.name)) {
            continue;
        }
        (mcpServer as any).registerTool(
            def.name,
            {
                description: def.description,
                annotations: mcpToolAnnotations(def.name),
                inputSchema: def.inputSchema as any,
            },
            async (args: unknown) => {
                const output = await def.execute(def.inputSchema.parse(args) as never);
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

    return mcpServer;
}

const mcp = new Hono();

mcp.all("*", async c => {
    // Stateless SDK transports are single-request objects; sharing one also mixes client ids.
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
    });
    try {
        await server.connect(transport);
        // JSON mode resolves only after the request's handler has produced its response.
        return await transport.handleRequest(c.req.raw);
    } finally {
        await server.close();
    }
});

export default mcp;
