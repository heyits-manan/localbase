/**
 * MCP Backend Summary Tool
 *
 * Provides a single tool that returns a comprehensive summary of the Localbase backend.
 * Fetches health status and resource list from the API, and combines them with
 * static configuration information about authentication and preferred tools.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Fetches JSON data from a Localbase API endpoint.
 * @param apiBaseUrl - The base URL for the Localbase API.
 * @param path - The API endpoint path.
 * @returns The parsed JSON response.
 * @throws Error if the response status is not OK.
 */
async function fetchJson(apiBaseUrl: string, path: string): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

/**
 * Registers the backend summary tool on the MCP server.
 * @param server - The MCP server instance.
 * @param apiBaseUrl - The base URL for the Localbase API.
 */
export function registerBackendSummaryTool(server: McpServer, apiBaseUrl: string): void {
  server.registerTool(
    "get_backend_summary",
    {
      description: "Summarize the local Localbase backend, API health, auth config, and known resources.",
      inputSchema: {}
    },
    async () => {
      try {
        // Fetch health and resources in parallel for efficiency
        const [health, resources] = await Promise.all([
          fetchJson(apiBaseUrl, "/health"),
          fetchJson(apiBaseUrl, "/resources")
        ]);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  apiBaseUrl,
                  health,
                  auth: {
                    enabled: true,
                    providers: ["email_password"],
                    ownedResources: {
                      enabled: true,
                      ownershipField: "user_id",
                      createWith: { ownedByUser: true }
                    }
                  },
                  resources,
                  // Preferred tools are the most commonly used tools for new users
                  preferredTools: [
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
                    "sign_up",
                    "sign_in"
                  ]
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          `Localbase API is not reachable at ${apiBaseUrl}. Start it with: docker compose up -d postgres && pnpm db:migrate && pnpm dev:api. Details: ${message}`
        );
      }
    }
  );
}
