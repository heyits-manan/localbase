import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerBackendSummaryTool } from "./tools/backend-summary.js";
import { registerResourceTools } from "./tools/resources.js";

export const expectedLocalbaseToolNames = [
  "get_backend_summary",
  "list_resources",
  "describe_resource",
  "create_resource",
  "delete_resource",
  "add_field",
  "update_field",
  "delete_field",
  "add_index",
  "create_relationship",
  "list_rows",
  "insert_row",
  "get_row",
  "update_row",
  "delete_row",
  "describe_auth_config",
  "sign_up",
  "sign_in",
  "get_current_user",
  "sign_out"
] as const;

export function createLocalbaseMcpServer(options: {
  apiBaseUrl: string;
  adminToken?: string;
  version?: string;
}): McpServer {
  const server = new McpServer({
    name: "localbase-mcp",
    version: options.version ?? "0.1.0"
  });

  registerResourceTools(server, options.apiBaseUrl, options.adminToken);
  registerAuthTools(server, options.apiBaseUrl);
  registerBackendSummaryTool(server, options.apiBaseUrl);

  return server;
}
