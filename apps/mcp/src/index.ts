import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerBackendSummaryTool } from "./tools/backend-summary.js";
import { registerResourceTools } from "./tools/resources.js";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

const server = new McpServer({
  name: "localbase-mcp",
  version: "0.1.0"
});

registerResourceTools(server, apiBaseUrl);
registerAuthTools(server);
registerBackendSummaryTool(server, apiBaseUrl);

const transport = new StdioServerTransport();
await server.connect(transport);
