import type { AuthUser } from "@localbase/shared";
import { pool } from "../db/client.js";
import { describeResource, getRegisteredFields } from "./schema-service.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

type JsonRecord = Record<string, unknown>;
type FilterOperator = "eq" | "ne" | "contains" | "gt" | "gte" | "lt" | "lte" | "isNull";
type Filter = {
  field: string;
  operator: FilterOperator;
  value: string;
};
type ListOptions = {
  filters: Filter[];
  limit: number;
  offset: number;
  orderBy: string;
  orderDirection: "ASC" | "DESC";
};

export type RowListOptions = {
  query: Record<string, unknown>;
  user?: AuthUser;
};

export type RowMutationOptions = {
  user?: AuthUser;
};

class AuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Authentication required");
  }
}

class RowNotFoundError extends Error {
  statusCode = 404;

  constructor() {
    super("Row not found");
  }
}

function ensureObject(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }
  return value as JsonRecord;
}

function getAllowedBodyEntries(body: JsonRecord, allowedFields: Set<string>): Array<[string, unknown]> {
  const entries = Object.entries(body);
  for (const [key] of entries) {
    assertSafeColumnName(key);
    if (key === "id" || key === "user_id" || key === "created_at" || key === "updated_at") {
      throw new Error(`Field cannot be modified: ${key}`);
    }
    if (!allowedFields.has(key)) {
      throw new Error(`Unknown field: ${key}`);
    }
  }

  return entries;
}

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

function isAllowedQueryField(field: string, allowedFields: Set<string>): boolean {
  return allowedFields.has(field) || field === "id" || field === "created_at" || field === "updated_at";
}

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
      for (const [operator, operatorValue] of Object.entries(rawValue as Record<string, unknown>)) {
        if (!["eq", "ne", "contains", "gt", "gte", "lt", "lte", "isNull"].includes(operator)) {
          throw new Error(`Unknown filter operator: ${operator}`);
        }
        addFilter(filters, allowedFields, fieldName, operator as FilterOperator, operatorValue);
      }
    } else {
      addFilter(filters, allowedFields, fieldName, "eq", rawValue);
    }
  }
}

function getListOptions(query: Record<string, unknown>, allowedFields: Set<string>): ListOptions {
  const filters: Filter[] = [];
  addNestedFilters(filters, query, allowedFields);

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

export async function listResourceRows(resourceName: string, options: RowListOptions): Promise<unknown[]> {
  const context = await getResourceContext(resourceName, options.user);
  const listOptions = getListOptions(options.query, context.allowedFields);
  const filters = listOptions.filters;
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

export async function insertResourceRow(
  resourceName: string,
  body: unknown,
  options: RowMutationOptions
): Promise<unknown> {
  const context = await getResourceContext(resourceName, options.user);
  const entries = getAllowedBodyEntries(ensureObject(body), context.allowedFields);
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
    `UPDATE ${quoteIdentifier(context.resourceName)} SET ${assignments.join(", ")} WHERE id = $${
      entries.length + 1
    }${ownerClause} RETURNING *`,
    values
  );
  if (!result.rows[0]) {
    throw new RowNotFoundError();
  }
  return result.rows[0];
}

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
