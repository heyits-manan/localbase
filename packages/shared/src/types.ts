import { z } from "zod";

export type FieldType = "text" | "integer" | "boolean" | "timestamp" | "uuid" | "jsonb";

export const fieldTypeSchema = z.enum(["text", "integer", "boolean", "timestamp", "uuid", "jsonb"]);

export const resourceFieldInputSchema = z.object({
  name: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  indexed: z.boolean().optional()
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

export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

export type AddResourceFieldInput = z.infer<typeof addResourceFieldInputSchema>;

export type AddResourceIndexInput = z.infer<typeof addResourceIndexInputSchema>;

export type LocalbaseField = {
  id: string;
  resourceId: string;
  name: string;
  type: FieldType;
  required: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  isIndexed: boolean;
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
