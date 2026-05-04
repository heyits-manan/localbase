import type { AddResourceFieldInput, CreateResourceInput } from "@backforge/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const columnTypeSchema = z.enum(["text", "integer", "boolean", "timestamp", "uuid", "jsonb"]);

const resourceFieldSchema = z.object({
  name: z.string().min(1),
  type: columnTypeSchema,
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  indexed: z.boolean().optional()
});

async function request(apiBaseUrl: string, path: string, authToken?: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers
    }
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

export function registerResourceTools(server: McpServer, apiBaseUrl: string): void {
  server.registerTool(
    "list_resources",
    {
      description: "List known Backforge resources.",
      inputSchema: {}
    },
    async () => request(apiBaseUrl, "/resources")
  );

  server.registerTool(
    "describe_resource",
    {
      description: "Describe a known Backforge resource.",
      inputSchema: {
        name: z.string().min(1)
      }
    },
    async ({ name }) => request(apiBaseUrl, `/resources/${encodeURIComponent(name)}`)
  );

  server.registerTool(
    "create_resource",
    {
      description: "Create a Backforge resource with fields, defaults, uniqueness, and basic indexes.",
      inputSchema: {
        name: z.string().min(1),
        ownedByUser: z.boolean().optional(),
        fields: z.array(resourceFieldSchema).default([])
      }
    },
    async (input: CreateResourceInput) =>
      request(apiBaseUrl, "/resources", undefined, {
        method: "POST",
        body: JSON.stringify(input)
      })
  );

  server.registerTool(
    "add_field",
    {
      description: "Add a field to an existing Backforge resource.",
      inputSchema: {
        resource: z.string().min(1),
        name: z.string().min(1),
        type: columnTypeSchema,
        required: z.boolean().optional(),
        unique: z.boolean().optional(),
        defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        indexed: z.boolean().optional()
      }
    },
    async ({ resource, ...field }: AddResourceFieldInput & { resource: string }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/fields`, undefined, {
        method: "POST",
        body: JSON.stringify(field)
      })
  );

  server.registerTool(
    "list_rows",
    {
      description: "List rows for a Backforge resource.",
      inputSchema: {
        resource: z.string().min(1),
        authToken: z.string().optional()
      }
    },
    async ({ resource, authToken }) => request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/rows`, authToken)
  );

  server.registerTool(
    "insert_row",
    {
      description: "Insert a row into a Backforge resource.",
      inputSchema: {
        resource: z.string().min(1),
        authToken: z.string().optional(),
        data: z.record(z.unknown())
      }
    },
    async ({ resource, authToken, data }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/rows`, authToken, {
        method: "POST",
        body: JSON.stringify(data)
      })
  );
}
