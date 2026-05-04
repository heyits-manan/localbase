import { Router } from "express";
import { pool } from "../db/client.js";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { describeResource, getRegisteredColumns } from "../services/schema-service.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

export const crudRouter: Router = Router();

type JsonRecord = Record<string, unknown>;
type Filter = {
  field: string;
  value: string;
};

function ensureObject(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }
  return value as JsonRecord;
}

function getAllowedBodyEntries(body: JsonRecord, allowedColumns: Set<string>): Array<[string, unknown]> {
  const entries = Object.entries(body);
  for (const [key] of entries) {
    assertSafeColumnName(key);
    if (key === "id" || key === "user_id" || key === "created_at" || key === "updated_at") {
      throw new Error(`Column cannot be modified: ${key}`);
    }
    if (!allowedColumns.has(key)) {
      throw new Error(`Unknown column: ${key}`);
    }
  }

  return entries;
}

function getFilters(query: Record<string, unknown>, allowedColumns: Set<string>): Filter[] {
  const filters: Filter[] = [];

  for (const [key, value] of Object.entries(query)) {
    const bracketMatch = /^where\[([a-zA-Z_][a-zA-Z0-9_]*)\]$/.exec(key);
    const fieldName = bracketMatch?.[1];
    if (!fieldName) {
      continue;
    }

    const safeName = assertSafeColumnName(fieldName);
    if (!allowedColumns.has(safeName)) {
      throw new Error(`Unknown filter column: ${safeName}`);
    }
    if (Array.isArray(value)) {
      throw new Error(`Filter column cannot be repeated: ${safeName}`);
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

class AuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Authentication required");
  }
}

crudRouter.get("/api/:table", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    const resource = await describeResource(tableName);
    const columns = await getRegisteredColumns(tableName);
    const allowedColumns = new Set(columns.map((column) => column.columnName));
    const filters = getFilters(req.query, allowedColumns);
    if (resource.ownedByUser) {
      if (!req.auth) {
        throw new AuthRequiredError();
      }
      filters.unshift({ field: "user_id", value: req.auth.user.id });
    }
    const where = toWhereSql(filters);
    const values = [...where.values, 100];

    const result = await pool.query(
      `SELECT * FROM ${quoteIdentifier(tableName)} ${where.sql} ORDER BY created_at DESC LIMIT $${values.length}`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

crudRouter.post("/api/:table", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    const resource = await describeResource(tableName);
    if (resource.ownedByUser && !req.auth) {
      throw new AuthRequiredError();
    }

    const columns = await getRegisteredColumns(tableName);
    const allowedColumns = new Set(columns.map((column) => column.columnName));
    const body = ensureObject(req.body);
    const entries = getAllowedBodyEntries(body, allowedColumns);
    if (resource.ownedByUser) {
      entries.push(["user_id", req.auth?.user.id]);
    }

    if (entries.length === 0) {
      const result = await pool.query(`INSERT INTO ${quoteIdentifier(tableName)} DEFAULT VALUES RETURNING *`);
      res.status(201).json(result.rows[0]);
      return;
    }

    const columnSql = entries.map(([key]) => quoteIdentifier(key)).join(", ");
    const placeholders = entries.map((_entry, index) => `$${index + 1}`).join(", ");
    const values = entries.map(([_key, value]) => value);
    const result = await pool.query(
      `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

crudRouter.get("/api/:table/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    const resource = await describeResource(tableName);
    const values = [req.params.id];
    let whereSql = "WHERE id = $1";
    if (resource.ownedByUser) {
      if (!req.auth) {
        throw new AuthRequiredError();
      }
      values.push(req.auth.user.id);
      whereSql += " AND user_id = $2";
    }

    const result = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)} ${whereSql} LIMIT 1`, values);
    if (!result.rows[0]) {
      res.status(404).json({ error: { message: "Row not found" } });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

crudRouter.patch("/api/:table/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    const resource = await describeResource(tableName);
    if (resource.ownedByUser && !req.auth) {
      throw new AuthRequiredError();
    }

    const columns = await getRegisteredColumns(tableName);
    const allowedColumns = new Set(columns.map((column) => column.columnName));
    const body = ensureObject(req.body);
    const entries = getAllowedBodyEntries(body, allowedColumns);

    if (entries.length === 0) {
      throw new Error("No valid columns provided");
    }

    const assignments = entries.map(([key], index) => `${quoteIdentifier(key)} = $${index + 1}`);
    assignments.push("updated_at = now()");
    const values = entries.map(([_key, value]) => value);
    values.push(req.params.id);
    const ownerClause = resource.ownedByUser ? ` AND user_id = $${values.length + 1}` : "";
    if (resource.ownedByUser) {
      values.push(req.auth?.user.id);
    }

    const result = await pool.query(
      `UPDATE ${quoteIdentifier(tableName)} SET ${assignments.join(", ")} WHERE id = $${
        entries.length + 1
      }${ownerClause} RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: { message: "Row not found" } });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

crudRouter.delete("/api/:table/:id", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    const resource = await describeResource(tableName);
    const values = [req.params.id];
    let whereSql = "WHERE id = $1";
    if (resource.ownedByUser) {
      if (!req.auth) {
        throw new AuthRequiredError();
      }
      values.push(req.auth.user.id);
      whereSql += " AND user_id = $2";
    }

    await pool.query(`DELETE FROM ${quoteIdentifier(tableName)} ${whereSql}`, values);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
