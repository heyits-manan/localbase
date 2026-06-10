/**
 * MCP Server Setup
 *
 * Creates and configures the Localbase MCP server instance.
 * Registers all available tools: resource management, authentication, and backend summary.
 * Defines the expected tool names for validation and discovery purposes.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerBackendSummaryTool } from "./tools/backend-summary.js";
import { registerResourceTools } from "./tools/resources.js";

/**
 * List of all expected tool names that the Localbase MCP server exposes.
 * Used for validation and discovery by MCP clients.
 */
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

/**
 * Creates and configures a new Localbase MCP server instance.
 * @param options - Server configuration options.
 * @param options.apiBaseUrl - The base URL for the Localbase API.
 * @param options.adminToken - Optional bearer token for admin operations.
 * @param options.version - Server version string (defaults to "0.1.0").
 * @returns The configured MCP server instance.
 */
export function createLocalbaseMcpServer(options: {
  apiBaseUrl: string;
  adminToken?: string;
  version?: string;
}): McpServer {
  const server = new McpServer({
    name: "localbase-mcp",
    version: options.version ?? "0.1.0"
  });

  // Register all tool categories on the server
  registerResourceTools(server, options.apiBaseUrl, options.adminToken);
  registerAuthTools(server, options.apiBaseUrl);
  registerBackendSummaryTool(server, options.apiBaseUrl);

  return server;
}
