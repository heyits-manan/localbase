/**
 * Shared Package Exports
 *
 * Re-exports all types and schemas from the shared package for easy consumption.
 * This is the main entry point for consumers of the @localbase/shared package.
 */

export type {
  AddResourceFieldInput,
  AddResourceIndexInput,
  CreateResourceRelationshipInput,
  FieldType,
  ReferenceOnDelete,
  AuthSession,
  AuthUser,
  CreateResourceInput,
  LocalbaseField,
  LocalbaseResource,
  UpdateResourceFieldInput
} from "./types.js";

export {
  addResourceFieldInputSchema,
  addResourceIndexInputSchema,
  createResourceRelationshipInputSchema,
  createResourceInputSchema,
  fieldTypeSchema,
  resourceFieldInputSchema,
  updateResourceFieldInputSchema
} from "./types.js";
