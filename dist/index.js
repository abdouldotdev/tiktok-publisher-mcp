#!/usr/bin/env node
/**
 * TikTok Farm MCP Server.
 * Reusable foundation MCP for TikTok authentication, multi-account farm management,
 * Content Posting API v2 publishing (photo carousels and videos), and analytics.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerProfileTools } from "./tools/profiles.js";
import { registerPublishTools } from "./tools/publish.js";
import { registerStatsTools } from "./tools/stats.js";
const server = new McpServer({
    name: "tiktok-farm-mcp",
    version: "1.0.0",
});
registerProfileTools(server);
registerAuthTools(server);
registerPublishTools(server);
registerStatsTools(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 TikTok Farm MCP server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error in TikTok Farm MCP server:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map