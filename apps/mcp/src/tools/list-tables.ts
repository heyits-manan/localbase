import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerListTablesTool(server: McpServer, apiBaseUrl: string): void {
  server.registerTool("list_tables", { description: "List known Backforge tables.", inputSchema: {} }, async () => {
    const response = await fetch(`${apiBaseUrl}/schema/tables`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  });
}

export const listTablesInputSchema = z.object({});
