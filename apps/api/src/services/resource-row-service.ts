import type { AuthUser } from "@localbase/shared";
import { pool } from "../db/client.js";
import { describeResource, getRegisteredFields } from "./schema-service.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

type JsonRecord = Record<string, unknown>;
type Filter = {
  field: string;
  value: string;
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

function getFilters(query: Record<string, unknown>, allowedFields: Set<string>): Filter[] {
  const filters: Filter[] = [];

  for (const [key, value] of Object.entries(query)) {
    const bracketMatch = /^where\[([a-zA-Z_][a-zA-Z0-9_]*)\]$/.exec(key);
    const fieldName = bracketMatch?.[1];
    if (!fieldName) {
      continue;
    }

    const safeName = assertSafeColumnName(fieldName);
    if (!allowedFields.has(safeName)) {
      throw new Error(`Unknown filter field: ${safeName}`);
    }
    if (Array.isArray(value)) {
      throw new Error(`Filter field cannot be repeated: ${safeName}`);
    }
    if (typeof value !== "string") {
      throw new Error(`Filter value must be a string: ${safeName}`);
    }

    filters.push({ field: safeName, value });
  }

  return filters;
}

function toWhereSql(filters: Filter[]): { sql: string; values: unknown[] } {
  if (filters.length === 0) {
    return { sql: "", values: [] };
  }

  return {
    sql: `WHERE ${filters.map((filter, index) => `${quoteIdentifier(filter.field)} = $${index + 1}`).join(" AND ")}`,
    values: filters.map((filter) => filter.value)
  };
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
  const filters = getFilters(options.query, context.allowedFields);
  if (context.resource.ownedByUser && options.user) {
    filters.unshift({ field: "user_id", value: options.user.id });
  }

  const where = toWhereSql(filters);
  const values = [...where.values, 100];
  const result = await pool.query(
    `SELECT * FROM ${quoteIdentifier(context.resourceName)} ${where.sql} ORDER BY created_at DESC LIMIT $${
      values.length
    }`,
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
