/**
 * Resource Row Service
 *
 * Handles CRUD operations for resource rows (data within user-defined resources).
 * Supports filtering, pagination, sorting, and user-scoped access for owned resources.
 * All SQL identifiers are sanitized to prevent injection attacks.
 */

import type { AuthUser } from "@localbase/shared";
import { pool } from "../db/client.js";
import { describeResource, getRegisteredFields } from "./schema-service.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

/** A generic JSON object record. */
type JsonRecord = Record<string, unknown>;

/** Supported filter operators for row queries. */
type FilterOperator = "eq" | "ne" | "contains" | "gt" | "gte" | "lt" | "lte" | "isNull";

/** A single filter condition for querying rows. */
type Filter = {
  field: string;
  operator: FilterOperator;
  value: string;
};

/** Internal list options parsed from query parameters. */
type ListOptions = {
  filters: Filter[];
  limit: number;
  offset: number;
  orderBy: string;
  orderDirection: "ASC" | "DESC";
};

/** Options for listing resource rows. */
export type RowListOptions = {
  query: Record<string, unknown>;
  user?: AuthUser;
};

/** Options for mutating (create/update/delete) resource rows. */
export type RowMutationOptions = {
  user?: AuthUser;
};

/** Error thrown when authentication is required but missing. */
class AuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Authentication required");
  }
}

/** Error thrown when a requested row does not exist. */
class RowNotFoundError extends Error {
  statusCode = 404;

  constructor() {
    super("Row not found");
  }
}

/**
 * Ensures the provided value is a plain JSON object.
 * @param value - The value to validate.
 * @returns The value as a JsonRecord.
 * @throws Error if the value is not a plain object.
 */
function ensureObject(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }
  return value as JsonRecord;
}

/**
 * Validates and returns body entries that are allowed for the resource.
 * Prevents modification of system fields (id, user_id, created_at, updated_at).
 * @param body - The request body.
 * @param allowedFields - Set of field names defined on the resource.
 * @returns Array of allowed key-value entries.
 * @throws Error for unknown or protected fields.
 */
function getAllowedBodyEntries(body: JsonRecord, allowedFields: Set<string>): Array<[string, unknown]> {
  const entries = Object.entries(body);
  for (const [key] of entries) {
    assertSafeColumnName(key);
    // Prevent clients from modifying system-managed fields
    if (key === "id" || key === "user_id" || key === "created_at" || key === "updated_at") {
      throw new Error(`Field cannot be modified: ${key}`);
    }
    if (!allowedFields.has(key)) {
      throw new Error(`Unknown field: ${key}`);
    }
  }

  return entries;
}

/**
 * Retrieves a single string value from query parameters.
 * @param query - The query object.
 * @param key - The parameter key.
 * @returns The string value, or undefined if not present.
 * @throws Error if the parameter is repeated or not a string.
 */
function getSingleQueryValue(query: Record<string, unknown>, key: string): string | undefined {
  const value = query[key];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    throw new Error(`Query parameter cannot be repeated: ${key}`);
  }
  if (typeof value !== "string") {
    throw new Error(`Query parameter must be a string: ${key}`);
  }
  return value;
}

/**
 * Parses an integer query parameter with validation.
 * @param query - The query object.
 * @param key - The parameter key.
 * @param defaultValue - The default if the parameter is missing.
 * @param min - The minimum allowed value.
 * @param max - The maximum allowed value.
 * @returns The parsed integer.
 * @throws Error if the value is not a valid integer within the range.
 */
function getIntegerQueryValue(
  query: Record<string, unknown>,
  key: string,
  defaultValue: number,
  { min, max }: { min: number; max: number }
): number {
  const value = getSingleQueryValue(query, key);
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

/**
 * Checks if a field is allowed in query operations (either a defined field or a system field).
 * @param field - The field name to check.
 * @param allowedFields - Set of defined resource fields.
 * @returns True if the field is allowed.
 */
function isAllowedQueryField(field: string, allowedFields: Set<string>): boolean {
  return allowedFields.has(field) || field === "id" || field === "created_at" || field === "updated_at";
}

/**
 * Adds a validated filter to the filters array.
 * @param filters - The array of filters to append to.
 * @param allowedFields - Set of defined resource fields.
 * @param fieldName - The field name to filter on.
 * @param operator - The filter operator.
 * @param value - The filter value.
 * @throws Error for invalid fields, repeated values, or unsupported types.
 */
function addFilter(filters: Filter[], allowedFields: Set<string>, fieldName: string, operator: FilterOperator, value: unknown): void {
  const safeName = assertSafeColumnName(fieldName);
  if (!isAllowedQueryField(safeName, allowedFields)) {
    throw new Error(`Unknown filter field: ${safeName}`);
  }
  if (Array.isArray(value)) {
    throw new Error(`Filter field cannot be repeated: ${safeName}`);
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new Error(`Filter value must be a string, number, or boolean: ${safeName}`);
  }

  filters.push({ field: safeName, operator, value: String(value) });
}

/**
 * Parses nested filter objects from the `where` query parameter.
 * Supports both shorthand equality and explicit operator objects.
 * @param filters - The array to populate with parsed filters.
 * @param query - The raw query object.
 * @param allowedFields - Set of defined resource fields.
 */
function addNestedFilters(filters: Filter[], query: Record<string, unknown>, allowedFields: Set<string>): void {
  const where = query.where;
  if (where === undefined) {
    return;
  }
  if (typeof where !== "object" || where === null || Array.isArray(where)) {
    throw new Error("where must be an object");
  }

  for (const [fieldName, rawValue] of Object.entries(where as Record<string, unknown>)) {
    if (typeof rawValue === "object" && rawValue !== null && !Array.isArray(rawValue)) {
      // Object syntax: { field: { operator: value } }
      for (const [operator, operatorValue] of Object.entries(rawValue as Record<string, unknown>)) {
        if (!["eq", "ne", "contains", "gt", "gte", "lt", "lte", "isNull"].includes(operator)) {
          throw new Error(`Unknown filter operator: ${operator}`);
        }
        addFilter(filters, allowedFields, fieldName, operator as FilterOperator, operatorValue);
      }
    } else {
      // Shorthand syntax: { field: value } implies equality
      addFilter(filters, allowedFields, fieldName, "eq", rawValue);
    }
  }
}

/**
 * Parses all query parameters into structured list options.
 * Handles both bracket-style filters (where[field][operator]) and nested object filters.
 * @param query - The raw query object.
 * @param allowedFields - Set of defined resource fields.
 * @returns Structured list options with filters, pagination, and sorting.
 */
function getListOptions(query: Record<string, unknown>, allowedFields: Set<string>): ListOptions {
  const filters: Filter[] = [];
  addNestedFilters(filters, query, allowedFields);

  // Parse bracket-style query parameters: where[field][operator]=value
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith("where[")) {
      continue;
    }

    const bracketMatch = /^where\[([a-zA-Z_][a-zA-Z0-9_]*)\](?:\[(eq|ne|contains|gt|gte|lt|lte|isNull)\])?$/.exec(key);
    const fieldName = bracketMatch?.[1];
    if (!fieldName) {
      throw new Error(`Invalid filter parameter: ${key}`);
    }

    const safeName = assertSafeColumnName(fieldName);
    if (!isAllowedQueryField(safeName, allowedFields)) {
      throw new Error(`Unknown filter field: ${safeName}`);
    }
    if (Array.isArray(value)) {
      throw new Error(`Filter field cannot be repeated: ${safeName}`);
    }
    if (typeof value !== "string") {
      throw new Error(`Filter value must be a string: ${safeName}`);
    }

    filters.push({ field: safeName, operator: (bracketMatch[2] as FilterOperator | undefined) ?? "eq", value });
  }

  const orderBy = assertSafeColumnName(getSingleQueryValue(query, "orderBy") ?? "created_at");
  if (!isAllowedQueryField(orderBy, allowedFields)) {
    throw new Error(`Unknown order field: ${orderBy}`);
  }

  const orderDirectionInput = (getSingleQueryValue(query, "orderDirection") ?? "desc").toLowerCase();
  if (orderDirectionInput !== "asc" && orderDirectionInput !== "desc") {
    throw new Error("orderDirection must be asc or desc");
  }

  return {
    filters,
    limit: getIntegerQueryValue(query, "limit", 100, { min: 1, max: 500 }),
    offset: getIntegerQueryValue(query, "offset", 0, { min: 0, max: 100000 }),
    orderBy,
    orderDirection: orderDirectionInput === "asc" ? "ASC" : "DESC"
  };
}

/**
 * Converts filter conditions into a SQL WHERE clause with parameterized values.
 * Uses parameterized queries to prevent SQL injection.
 * @param filters - The array of filter conditions.
 * @returns An object containing the SQL WHERE clause string and the values array.
 */
function toWhereSql(filters: Filter[]): { sql: string; values: unknown[] } {
  if (filters.length === 0) {
    return { sql: "", values: [] };
  }

  const values: unknown[] = [];
  const clauses = filters.map((filter) => {
    if (filter.operator === "isNull") {
      const normalized = filter.value.toLowerCase();
      if (normalized !== "true" && normalized !== "false") {
        throw new Error(`isNull filter must be true or false: ${filter.field}`);
      }
      return `${quoteIdentifier(filter.field)} IS ${normalized === "true" ? "" : "NOT "}NULL`;
    }

    values.push(filter.value);
    const placeholder = `$${values.length}`;
    const fieldSql = quoteIdentifier(filter.field);
    switch (filter.operator) {
      case "eq":
        return `${fieldSql} = ${placeholder}`;
      case "ne":
        return `${fieldSql} <> ${placeholder}`;
      case "contains":
        // Use ILIKE for case-insensitive substring matching with concatenation
        return `${fieldSql}::text ILIKE '%' || ${placeholder} || '%'`;
      case "gt":
        return `${fieldSql} > ${placeholder}`;
      case "gte":
        return `${fieldSql} >= ${placeholder}`;
      case "lt":
        return `${fieldSql} < ${placeholder}`;
      case "lte":
        return `${fieldSql} <= ${placeholder}`;
    }
  });

  return { sql: `WHERE ${clauses.join(" AND ")}`, values };
}

/**
 * Retrieves the resource context including metadata, fields, and access control info.
 * Validates the resource name and enforces authentication for user-owned resources.
 * @param resourceName - The name of the resource.
 * @param user - The authenticated user, if any.
 * @returns The resource context object.
 * @throws AuthRequiredError if the resource is owned by user and no user is provided.
 */
async function getResourceContext(resourceName: string, user?: AuthUser) {
  const safeResourceName = assertSafeTableName(resourceName);
  const resource = await describeResource(safeResourceName);
  if (resource.ownedByUser && !user) {
    throw new AuthRequiredError();
  }

  const fields = await getRegisteredFields(safeResourceName);
  return {
    resource,
    resourceName: safeResourceName,
    allowedFields: new Set(fields.map((field) => field.name))
  };
}

/**
 * Lists rows for a given resource with optional filtering, pagination, and sorting.
 * Automatically adds a user_id filter for user-owned resources.
 * @param resourceName - The name of the resource.
 * @param options - Query and user context for the request.
 * @returns An array of row objects.
 */
export async function listResourceRows(resourceName: string, options: RowListOptions): Promise<unknown[]> {
  const context = await getResourceContext(resourceName, options.user);
  const listOptions = getListOptions(options.query, context.allowedFields);
  const filters = listOptions.filters;
  // Enforce row-level ownership for user-owned resources
  if (context.resource.ownedByUser && options.user) {
    filters.unshift({ field: "user_id", operator: "eq", value: options.user.id });
  }

  const where = toWhereSql(filters);
  const values = [...where.values, listOptions.limit, listOptions.offset];
  const result = await pool.query(
    `SELECT * FROM ${quoteIdentifier(context.resourceName)} ${where.sql} ORDER BY ${quoteIdentifier(
      listOptions.orderBy
    )} ${listOptions.orderDirection} LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
}

/**
 * Inserts a new row into a resource.
 * Automatically injects user_id for user-owned resources.
 * @param resourceName - The name of the resource.
 * @param body - The row data to insert.
 * @param options - User context for the request.
 * @returns The created row object.
 */
export async function insertResourceRow(
  resourceName: string,
  body: unknown,
  options: RowMutationOptions
): Promise<unknown> {
  const context = await getResourceContext(resourceName, options.user);
  const entries = getAllowedBodyEntries(ensureObject(body), context.allowedFields);
  // Inject user_id for owned resources so the row is associated with the user
  if (context.resource.ownedByUser) {
    entries.push(["user_id", options.user?.id]);
  }

  if (entries.length === 0) {
    const result = await pool.query(`INSERT INTO ${quoteIdentifier(context.resourceName)} DEFAULT VALUES RETURNING *`);
    return result.rows[0];
  }

  const fieldSql = entries.map(([key]) => quoteIdentifier(key)).join(", ");
  const placeholders = entries.map((_entry, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([_key, value]) => value);
  const result = await pool.query(
    `INSERT INTO ${quoteIdentifier(context.resourceName)} (${fieldSql}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Retrieves a single row by ID.
 * For user-owned resources, enforces that the row belongs to the requesting user.
 * @param resourceName - The name of the resource.
 * @param rowId - The ID of the row to retrieve.
 * @param options - User context for the request.
 * @returns The row object.
 * @throws RowNotFoundError if the row does not exist or is not accessible.
 */
export async function getResourceRow(
  resourceName: string,
  rowId: string,
  options: RowMutationOptions
): Promise<unknown> {
  const context = await getResourceContext(resourceName, options.user);
  const values: unknown[] = [rowId];
  let whereSql = "WHERE id = $1";
  if (context.resource.ownedByUser) {
    values.push(options.user?.id);
    whereSql += " AND user_id = $2";
  }

  const result = await pool.query(
    `SELECT * FROM ${quoteIdentifier(context.resourceName)} ${whereSql} LIMIT 1`,
    values
  );
  if (!result.rows[0]) {
    throw new RowNotFoundError();
  }
  return result.rows[0];
}

/**
 * Updates a single row by ID.
 * Automatically updates the updated_at timestamp and enforces ownership for user-owned resources.
 * @param resourceName - The name of the resource.
 * @param rowId - The ID of the row to update.
 * @param body - The fields to update.
 * @param options - User context for the request.
 * @returns The updated row object.
 * @throws RowNotFoundError if the row does not exist or is not accessible.
 * @throws Error if no valid fields are provided.
 */
export async function updateResourceRow(
  resourceName: string,
  rowId: string,
  body: unknown,
  options: RowMutationOptions
): Promise<unknown> {
  const context = await getResourceContext(resourceName, options.user);
  const entries = getAllowedBodyEntries(ensureObject(body), context.allowedFields);
  if (entries.length === 0) {
    throw new Error("No valid fields provided");
  }

  const assignments = entries.map(([key], index) => `${quoteIdentifier(key)} = $${index + 1}`);
  assignments.push("updated_at = now()");
  const values = entries.map(([_key, value]) => value);
  values.push(rowId);
  const ownerClause = context.resource.ownedByUser ? ` AND user_id = $${values.length + 1}` : "";
  if (context.resource.ownedByUser) {
    values.push(options.user?.id);
  }

  const result = await pool.query(
    `UPDATE ${quoteIdentifier(context.resourceName)} SET ${assignments.join(", ")} WHERE id = $$${
      entries.length + 1
    }${ownerClause} RETURNING *`,
    values
  );
  if (!result.rows[0]) {
    throw new RowNotFoundError();
  }
  return result.rows[0];
}

/**
 * Deletes a single row by ID.
 * For user-owned resources, enforces that the row belongs to the requesting user.
 * @param resourceName - The name of the resource.
 * @param rowId - The ID of the row to delete.
 * @param options - User context for the request.
 * @returns An object indicating success.
 * @throws RowNotFoundError if the row does not exist or is not accessible.
 */
export async function deleteResourceRow(
  resourceName: string,
  rowId: string,
  options: RowMutationOptions
): Promise<{ ok: true }> {
  const context = await getResourceContext(resourceName, options.user);
  const values: unknown[] = [rowId];
  let whereSql = "WHERE id = $1";
  if (context.resource.ownedByUser) {
    values.push(options.user?.id);
    whereSql += " AND user_id = $2";
  }

  const result = await pool.query(`DELETE FROM ${quoteIdentifier(context.resourceName)} ${whereSql} RETURNING id`, values);
  if (!result.rows[0]) {
    throw new RowNotFoundError();
  }
  return { ok: true };
}
