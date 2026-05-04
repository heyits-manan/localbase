import { Router } from "express";
import { z } from "zod";
import {
  addResourceField,
  addResourceFieldInputSchema,
  addResourceIndex,
  addResourceIndexInputSchema,
  createResource,
  createResourceInputSchema,
  describeResource,
  getRegisteredColumns,
  listResources
} from "../services/schema-service.js";
import { pool } from "../db/client.js";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

export const resourcesRouter: Router = Router();

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
      throw new Error(`Field cannot be modified: ${key}`);
    }
    if (!allowedColumns.has(key)) {
      throw new Error(`Unknown field: ${key}`);
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

resourcesRouter.get("/resources", async (_req, res, next) => {
  try {
    res.json(await listResources());
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources", async (req, res, next) => {
  try {
    const input = createResourceInputSchema.parse(req.body);
    res.status(201).json(await createResource(input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new Error(error.issues.map((issue) => issue.message).join("; ")));
      return;
    }
    next(error);
  }
});

resourcesRouter.post("/resources/:name/fields", async (req, res, next) => {
  try {
    const input = addResourceFieldInputSchema.parse(req.body);
    res.json(await addResourceField(req.params.name, input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new Error(error.issues.map((issue) => issue.message).join("; ")));
      return;
    }
    next(error);
  }
});

resourcesRouter.post("/resources/:name/indexes", async (req, res, next) => {
  try {
    const input = addResourceIndexInputSchema.parse(req.body);
    res.json(await addResourceIndex(req.params.name, input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new Error(error.issues.map((issue) => issue.message).join("; ")));
      return;
    }
    next(error);
  }
});

resourcesRouter.get("/resources/:name", async (req, res, next) => {
  try {
    res.json(await describeResource(req.params.name));
  } catch (error) {
    next(error);
  }
});

class AuthRequiredError extends Error {
  statusCode = 401;

  constructor() {
    super("Authentication required");
  }
}

resourcesRouter.get("/resources/:name/rows", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const resourceName = assertSafeTableName(req.params.name);
    const resource = await describeResource(resourceName);
    const columns = await getRegisteredColumns(resourceName);
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
      `SELECT * FROM ${quoteIdentifier(resourceName)} ${where.sql} ORDER BY created_at DESC LIMIT $${values.length}`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources/:name/rows", optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const resourceName = assertSafeTableName(req.params.name);
    const resource = await describeResource(resourceName);
    if (resource.ownedByUser && !req.auth) {
      throw new AuthRequiredError();
    }

    const columns = await getRegisteredColumns(resourceName);
    const allowedColumns = new Set(columns.map((column) => column.columnName));
    const body = ensureObject(req.body);
    const entries = getAllowedBodyEntries(body, allowedColumns);
    if (resource.ownedByUser) {
      entries.push(["user_id", req.auth?.user.id]);
    }

    if (entries.length === 0) {
      const result = await pool.query(`INSERT INTO ${quoteIdentifier(resourceName)} DEFAULT VALUES RETURNING *`);
      res.status(201).json(result.rows[0]);
      return;
    }

    const columnSql = entries.map(([key]) => quoteIdentifier(key)).join(", ");
    const placeholders = entries.map((_entry, index) => `$${index + 1}`).join(", ");
    const values = entries.map(([_key, value]) => value);
    const result = await pool.query(
      `INSERT INTO ${quoteIdentifier(resourceName)} (${columnSql}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
