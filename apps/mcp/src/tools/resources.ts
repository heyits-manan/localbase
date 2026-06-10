/**
 * MCP Resource Tools
 *
 * Registers resource management tools on the MCP server.
 * Provides tools for: listing, describing, creating, and deleting resources,
 * as well as managing fields, indexes, and relationships.
 * Also includes full CRUD operations for resource rows with support for filtering and pagination.
 */

import type {
  AddResourceFieldInput,
  CreateResourceInput,
  CreateResourceRelationshipInput,
  UpdateResourceFieldInput
} from "@localbase/shared";
import {
  createResourceInputSchema,
  createResourceRelationshipInputSchema,
  resourceFieldInputSchema,
  updateResourceFieldInputSchema
} from "@localbase/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Makes an HTTP request to the Localbase API and formats the response for MCP.
 * @param apiBaseUrl - The base URL for the Localbase API.
 * @param path - The API endpoint path.
 * @param authToken - Optional bearer token for authenticated requests.
 * @param init - Additional fetch options.
 * @returns Formatted MCP tool response content.
 * @throws Error if the response status is not OK.
 */
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

/**
 * Zod schema for a filter value in row list queries.
 * Supports direct values or operator objects for advanced filtering.
 */
const filterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({
    eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
    ne: z.union([z.string(), z.number(), z.boolean()]).optional(),
    contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
    gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
    gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
    lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
    lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
    isNull: z.boolean().optional()
  })
]);

/**
 * Builds a URL query string from row list filter and pagination parameters.
 * Supports nested object filters (e.g., { where: { field: { eq: value } } }).
 * @param input - The filter and pagination parameters.
 * @returns The constructed query string, or empty string if no parameters.
 */
export function buildRowListQuery(input: {
  where?: Record<string, z.infer<typeof filterValueSchema>>;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}): string {
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(input.where ?? {})) {
    if (typeof value === "object" && value !== null) {
      // Handle operator object syntax: { field: { operator: value } }
      for (const [operator, operatorValue] of Object.entries(value)) {
        if (operatorValue !== undefined) {
          params.set(`where[${field}][${operator}]`, String(operatorValue));
        }
      }
    } else {
      // Handle direct value syntax: { field: value } implies equality
      params.set(`where[${field}]`, String(value));
    }
  }
  if (input.limit !== undefined) {
    params.set("limit", String(input.limit));
  }
  if (input.offset !== undefined) {
    params.set("offset", String(input.offset));
  }
  if (input.orderBy !== undefined) {
    params.set("orderBy", input.orderBy);
  }
  if (input.orderDirection !== undefined) {
    params.set("orderDirection", input.orderDirection);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Registers all resource management tools on the MCP server.
 * @param server - The MCP server instance.
 * @param apiBaseUrl - The base URL for the Localbase API.
 * @param adminToken - Optional bearer token for admin operations.
 */
export function registerResourceTools(server: McpServer, apiBaseUrl: string, adminToken?: string): void {
  // List all known resources
  server.registerTool(
    "list_resources",
    {
      description: "List known Localbase resources.",
      inputSchema: {}
    },
    async () => request(apiBaseUrl, "/resources")
  );

  // Describe a specific resource
  server.registerTool(
    "describe_resource",
    {
      description: "Describe a known Localbase resource.",
      inputSchema: {
        name: z.string().min(1)
      }
    },
    async ({ name }) => request(apiBaseUrl, `/resources/${encodeURIComponent(name)}`)
  );

  // Create a new resource (admin only)
  server.registerTool(
    "create_resource",
    {
      description: "Create a Localbase resource with fields, defaults, uniqueness, and basic indexes.",
      inputSchema: {
        ...createResourceInputSchema.shape
      }
    },
    async (input: CreateResourceInput) =>
      request(apiBaseUrl, "/resources", adminToken, {
        method: "POST",
        body: JSON.stringify(input)
      })
  );

  // Delete a resource (admin only)
  server.registerTool(
    "delete_resource",
    {
      description: "Delete a Localbase resource, including its rows and metadata.",
      inputSchema: {
        name: z.string().min(1)
      }
    },
    async ({ name }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(name)}`, adminToken, {
        method: "DELETE"
      })
  );

  // Add a field to a resource (admin only)
  server.registerTool(
    "add_field",
    {
      description: "Add a field to an existing Localbase resource.",
      inputSchema: {
        resource: z.string().min(1),
        ...resourceFieldInputSchema.shape
      }
    },
    async ({ resource, ...field }: AddResourceFieldInput & { resource: string }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/fields`, adminToken, {
        method: "POST",
        body: JSON.stringify(field)
      })
  );

  // Update a field on a resource (admin only)
  server.registerTool(
    "update_field",
    {
      description: "Rename a field or update its required/default/index metadata.",
      inputSchema: {
        resource: z.string().min(1),
        field: z.string().min(1),
        ...updateResourceFieldInputSchema.shape
      }
    },
    async ({ resource, field, ...input }: UpdateResourceFieldInput & { resource: string; field: string }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/fields/${encodeURIComponent(field)}`, adminToken, {
        method: "PATCH",
        body: JSON.stringify(input)
      })
  );

  // Delete a field from a resource (admin only)
  server.registerTool(
    "delete_field",
    {
      description: "Delete a field from a Localbase resource.",
      inputSchema: {
        resource: z.string().min(1),
        field: z.string().min(1)
      }
    },
    async ({ resource, field }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/fields/${encodeURIComponent(field)}`, adminToken, {
        method: "DELETE"
      })
  );

  // Add an index to a resource field (admin only)
  server.registerTool(
    "add_index",
    {
      description: "Add an index to an existing Localbase resource field.",
      inputSchema: {
        resource: z.string().min(1),
        field: z.string().min(1)
      }
    },
    async ({ resource, field }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/indexes`, adminToken, {
        method: "POST",
        body: JSON.stringify({ field })
      })
  );

  // Create a relationship between resources (admin only)
  server.registerTool(
    "create_relationship",
    {
      description: "Create a uuid relationship field that references another Localbase resource.",
      inputSchema: {
        resource: z.string().min(1),
        ...createResourceRelationshipInputSchema.shape
      }
    },
    async ({ resource, ...input }: CreateResourceRelationshipInput & { resource: string }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/relationships`, adminToken, {
        method: "POST",
        body: JSON.stringify(input)
      })
  );

  // List rows for a resource with optional filtering and pagination
  server.registerTool(
    "list_rows",
    {
      description: "List rows for a Localbase resource.",
      inputSchema: {
        resource: z.string().min(1),
        authToken: z.string().optional(),
        where: z.record(filterValueSchema).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.string().optional(),
        orderDirection: z.enum(["asc", "desc"]).optional()
      }
    },
    async ({ resource, authToken, where, limit, offset, orderBy, orderDirection }) =>
      request(
        apiBaseUrl,
        `/resources/${encodeURIComponent(resource)}/rows${buildRowListQuery({
          where,
          limit,
          offset,
          orderBy,
          orderDirection
        })}`,
        authToken
      )
  );

  // Insert a new row into a resource
  server.registerTool(
    "insert_row",
    {
      description: "Insert a row into a Localbase resource.",
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

  // Get a single row by ID
  server.registerTool(
    "get_row",
    {
      description: "Get one row from a Localbase resource by id.",
      inputSchema: {
        resource: z.string().min(1),
        id: z.string().min(1),
        authToken: z.string().optional()
      }
    },
    async ({ resource, id, authToken }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/rows/${encodeURIComponent(id)}`, authToken)
  );

  // Update a single row by ID
  server.registerTool(
    "update_row",
    {
      description: "Update one row in a Localbase resource by id.",
      inputSchema: {
        resource: z.string().min(1),
        id: z.string().min(1),
        authToken: z.string().optional(),
        data: z.record(z.unknown())
      }
    },
    async ({ resource, id, authToken, data }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/rows/${encodeURIComponent(id)}`, authToken, {
        method: "PATCH",
        body: JSON.stringify(data)
      })
  );

  // Delete a single row by ID
  server.registerTool(
    "delete_row",
    {
      description: "Delete one row from a Localbase resource by id.",
      inputSchema: {
        resource: z.string().min(1),
        id: z.string().min(1),
        authToken: z.string().optional()
      }
    },
    async ({ resource, id, authToken }) =>
      request(apiBaseUrl, `/resources/${encodeURIComponent(resource)}/rows/${encodeURIComponent(id)}`, authToken, {
        method: "DELETE"
      })
  );
}
