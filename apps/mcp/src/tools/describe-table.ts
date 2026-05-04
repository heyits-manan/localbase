import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const describeTableInputSchema = z.object({
  tableName: z.string().min(1)
});

export function registerDescribeTableTool(server: McpServer, apiBaseUrl: string): void {
  server.registerTool(
    "describe_table",
    {
      description: "Describe a known Backforge table.",
      inputSchema: {
        tableName: z.string().min(1)
      }
    },
    async ({ tableName }) => {
      const response = await fetch(`${apiBaseUrl}/schema/tables/${encodeURIComponent(tableName)}`);
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
    }
  );
}
