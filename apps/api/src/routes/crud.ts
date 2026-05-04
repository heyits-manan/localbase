import { Router } from "express";
import { pool } from "../db/client.js";
import { getRegisteredColumns } from "../services/schema-service.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

export const crudRouter: Router = Router();

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
      throw new Error(`Column cannot be modified: ${key}`);
    }
    if (!allowedColumns.has(key)) {
      throw new Error(`Unknown column: ${key}`);
    }
  }

  return entries;
}

crudRouter.get("/api/:table", async (req, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    await getRegisteredColumns(tableName);
    const result = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY created_at DESC LIMIT $1`, [100]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

crudRouter.post("/api/:table", async (req, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    const columns = await getRegisteredColumns(tableName);
    const allowedColumns = new Set(columns.map((column) => column.columnName));
    const body = ensureObject(req.body);
    const entries = getAllowedBodyEntries(body, allowedColumns);

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

crudRouter.get("/api/:table/:id", async (req, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    await getRegisteredColumns(tableName);
    const result = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)} WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: { message: "Row not found" } });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

crudRouter.patch("/api/:table/:id", async (req, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
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

    const result = await pool.query(
      `UPDATE ${quoteIdentifier(tableName)} SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING *`,
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

crudRouter.delete("/api/:table/:id", async (req, res, next) => {
  try {
    const tableName = assertSafeTableName(req.params.table);
    await getRegisteredColumns(tableName);
    await pool.query(`DELETE FROM ${quoteIdentifier(tableName)} WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
