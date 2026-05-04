import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerCreateTableTool } from "./tools/create-table.js";
import { registerDescribeTableTool } from "./tools/describe-table.js";
import { registerListTablesTool } from "./tools/list-tables.js";
import { registerResourceTools } from "./tools/resources.js";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

const server = new McpServer({
  name: "backforge-mcp",
  version: "0.1.0"
});

registerListTablesTool(server, apiBaseUrl);
registerDescribeTableTool(server, apiBaseUrl);
registerCreateTableTool(server, apiBaseUrl);
registerResourceTools(server, apiBaseUrl);
registerAuthTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
