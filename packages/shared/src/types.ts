/**
 * Shared Types and Schemas
 *
 * Defines Zod validation schemas and TypeScript types shared across the Localbase monorepo.
 * Used by both the API server and MCP server for consistent validation and type safety.
 * Includes schemas for resource fields, resource creation, relationships, and authentication types.
 */

import { z } from "zod";

/** Supported PostgreSQL field types for Localbase resources. */
export type FieldType = "text" | "integer" | "boolean" | "timestamp" | "uuid" | "jsonb";

/** Supported ON DELETE behaviors for foreign key relationships. */
export type ReferenceOnDelete = "restrict" | "cascade" | "set null";

/** Zod schema for valid field types. */
export const fieldTypeSchema = z.enum(["text", "integer", "boolean", "timestamp", "uuid", "jsonb"]);

/**
 * Zod schema for a resource field definition.
 * Defines validation for name, type, constraints, default values, and foreign key references.
 */
export const resourceFieldInputSchema = z.object({
  name: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  indexed: z.boolean().optional(),
  references: z
    .object({
      resource: z.string().min(1),
      field: z.string().min(1).default("id"),
      onDelete: z.enum(["restrict", "cascade", "set null"]).optional()
    })
    .optional()
});

/**
 * Zod schema for creating a new resource.
 * Includes the resource name, optional user ownership flag, and an array of field definitions.
 */
export const createResourceInputSchema = z.object({
  name: z.string().min(1),
  ownedByUser: z.boolean().optional(),
  fields: z.array(resourceFieldInputSchema).default([])
});

/** Zod schema for adding a field to an existing resource (same as resource field schema). */
export const addResourceFieldInputSchema = resourceFieldInputSchema;

/** Zod schema for adding an index to a resource field. */
export const addResourceIndexInputSchema = z.object({
  field: z.string().min(1)
});

/**
 * Zod schema for creating a relationship between resources.
 * Defines a foreign key field that references another resource.
 */
export const createResourceRelationshipInputSchema = z.object({
  field: z.string().min(1),
  references: z.object({
    resource: z.string().min(1),
    field: z.string().min(1).default("id"),
    onDelete: z.enum(["restrict", "cascade", "set null"]).default("restrict")
  }),
  required: z.boolean().optional(),
  unique: z.boolean().optional()
});

/**
 * Zod schema for updating a resource field's metadata.
 * Supports renaming, changing required status, default value, and indexed status.
 */
export const updateResourceFieldInputSchema = z.object({
  name: z.string().min(1).optional(),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  indexed: z.boolean().optional()
});

/** Type for creating a new resource, inferred from the Zod schema. */
export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

/** Type for adding a field to a resource, inferred from the Zod schema. */
export type AddResourceFieldInput = z.infer<typeof addResourceFieldInputSchema>;

/** Type for adding an index, inferred from the Zod schema. */
export type AddResourceIndexInput = z.infer<typeof addResourceIndexInputSchema>;

/** Type for creating a relationship, inferred from the Zod schema. */
export type CreateResourceRelationshipInput = z.infer<typeof createResourceRelationshipInputSchema>;

/** Type for updating a field, inferred from the Zod schema. */
export type UpdateResourceFieldInput = z.infer<typeof updateResourceFieldInputSchema>;

/** Type representing a field definition in a Localbase resource. */
export type LocalbaseField = {
  id: string;
  resourceId: string;
  name: string;
  type: FieldType;
  required: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  isIndexed: boolean;
  references?: {
    resource: string;
    field: string;
    onDelete: ReferenceOnDelete;
  };
  createdAt: string;
};

/** Type representing a Localbase resource (table) with its metadata. */
export type LocalbaseResource = {
  id: string;
  projectId: string;
  name: string;
  ownedByUser: boolean;
  createdAt: string;
  fields?: LocalbaseField[];
};

/** Type representing an authenticated user. */
export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

/** Type representing an authenticated session with a bearer token. */
export type AuthSession = {
  token: string;
  user: AuthUser;
};
