import { z } from "zod";

export type FieldType = "text" | "integer" | "boolean" | "timestamp" | "uuid" | "jsonb";
export type ReferenceOnDelete = "restrict" | "cascade" | "set null";

export const fieldTypeSchema = z.enum(["text", "integer", "boolean", "timestamp", "uuid", "jsonb"]);

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

export const createResourceInputSchema = z.object({
  name: z.string().min(1),
  ownedByUser: z.boolean().optional(),
  fields: z.array(resourceFieldInputSchema).default([])
});

export const addResourceFieldInputSchema = resourceFieldInputSchema;

export const addResourceIndexInputSchema = z.object({
  field: z.string().min(1)
});

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

export const updateResourceFieldInputSchema = z.object({
  name: z.string().min(1).optional(),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  indexed: z.boolean().optional()
});

export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

export type AddResourceFieldInput = z.infer<typeof addResourceFieldInputSchema>;

export type AddResourceIndexInput = z.infer<typeof addResourceIndexInputSchema>;

export type CreateResourceRelationshipInput = z.infer<typeof createResourceRelationshipInputSchema>;

export type UpdateResourceFieldInput = z.infer<typeof updateResourceFieldInputSchema>;

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

export type LocalbaseResource = {
  id: string;
  projectId: string;
  name: string;
  ownedByUser: boolean;
  createdAt: string;
  fields?: LocalbaseField[];
};

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};
