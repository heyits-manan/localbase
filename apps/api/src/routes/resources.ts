import { Router } from "express";
import { z } from "zod";
import {
  createResource,
  createResourceInputSchema,
  describeResource,
  listResources
} from "../services/schema-service.js";
import { pool } from "../db/client.js";
import { getRegisteredColumns } from "../services/schema-service.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

export const resourcesRouter: Router = Router();

type JsonRecord = Record<string, unknown>;

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
    if (key === "id" || key === "created_at" || key === "updated_at") {
      throw new Error(`Field cannot be modified: ${key}`);
    }
    if (!allowedColumns.has(key)) {
      throw new Error(`Unknown field: ${key}`);
    }
  }

  return entries;
}

resourcesRouter.get("/resources", async (_req, res, next) => {
  try {
    res.json(await listResources());
  } catch (error) {
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

resourcesRouter.get("/resources/:name/rows", async (req, res, next) => {
  try {
    const resourceName = assertSafeTableName(req.params.name);
    await getRegisteredColumns(resourceName);
    const result = await pool.query(`SELECT * FROM ${quoteIdentifier(resourceName)} ORDER BY created_at DESC LIMIT $1`, [
      100
    ]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

resourcesRouter.post("/resources/:name/rows", async (req, res, next) => {
  try {
    const resourceName = assertSafeTableName(req.params.name);
    const columns = await getRegisteredColumns(resourceName);
    const allowedColumns = new Set(columns.map((column) => column.columnName));
    const body = ensureObject(req.body);
    const entries = getAllowedBodyEntries(body, allowedColumns);

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
