import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

async function fetchJson(apiBaseUrl: string, path: string): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

export function registerBackendSummaryTool(server: McpServer, apiBaseUrl: string): void {
  server.registerTool(
    "get_backend_summary",
    {
      description: "Summarize the local Backforge backend, API health, auth config, and known resources.",
      inputSchema: {}
    },
    async () => {
      try {
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
                      ownershipColumn: "user_id",
                      createWith: { ownedByUser: true }
                    }
                  },
                  resources,
                  preferredTools: [
                    "get_backend_summary",
                    "list_resources",
                    "describe_resource",
                    "create_resource",
                    "add_field",
                    "add_index",
                    "list_rows",
                    "insert_row"
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
          `Backforge API is not reachable at ${apiBaseUrl}. Start it with: docker compose up -d postgres && pnpm db:migrate && pnpm dev:api. Details: ${message}`
        );
      }
    }
  );
}
