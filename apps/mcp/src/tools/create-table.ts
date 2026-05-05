import type { CreateTableInput } from "@localbase/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const columnTypeSchema = z.enum(["text", "integer", "boolean", "timestamp", "uuid", "jsonb"]);

export const createTableToolInputSchema = z.object({
  tableName: z.string().min(1),
  columns: z.array(
    z.object({
      name: z.string().min(1),
      type: columnTypeSchema,
      nullable: z.boolean().optional(),
      unique: z.boolean().optional(),
      defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
      indexed: z.boolean().optional()
    })
  )
});

export function registerCreateTableTool(server: McpServer, apiBaseUrl: string): void {
  server.registerTool(
    "create_table",
    {
      description: "Create a Localbase table.",
      inputSchema: {
        tableName: z.string().min(1),
        columns: z.array(
          z.object({
            name: z.string().min(1),
            type: columnTypeSchema,
            nullable: z.boolean().optional(),
            unique: z.boolean().optional(),
            defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
            indexed: z.boolean().optional()
          })
        )
      }
    },
    async (input: CreateTableInput) => {
      const response = await fetch(`${apiBaseUrl}/schema/tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
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
