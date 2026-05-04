import type { ColumnType, CreateTableInput, ForgeColumn, ForgeTable } from "@backforge/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../db/client.js";
import { ensureDefaultProject, forgeColumns, forgeTables } from "../db/schema/forge.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

const columnTypes = ["text", "integer", "boolean", "timestamp", "uuid", "jsonb"] as const;
const reservedPrefixes = ["forge_", "auth_", "storage_"];
const systemColumns = new Set(["id", "created_at", "updated_at"]);

const columnTypeSql: Record<ColumnType, string> = {
  text: "TEXT",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  timestamp: "TIMESTAMPTZ",
  uuid: "UUID",
  jsonb: "JSONB"
};

export const createTableInputSchema = z.object({
  tableName: z.string().min(1),
  columns: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(columnTypes),
        nullable: z.boolean().optional(),
        unique: z.boolean().optional()
      })
    )
    .default([])
});

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toForgeColumn(row: typeof forgeColumns.$inferSelect): ForgeColumn {
  return {
    id: row.id,
    tableId: row.tableId ?? "",
    columnName: row.columnName,
    columnType: row.columnType as ColumnType,
    nullable: row.nullable,
    isUnique: row.isUnique,
    createdAt: row.createdAt.toISOString()
  };
}

function toForgeTable(row: typeof forgeTables.$inferSelect, columns?: ForgeColumn[]): ForgeTable {
  return {
    id: row.id,
    projectId: row.projectId ?? "",
    tableName: row.tableName,
    createdAt: row.createdAt.toISOString(),
    columns
  };
}

function validateTableName(tableName: string): string {
  const safeName = assertSafeTableName(tableName);
  if (reservedPrefixes.some((prefix) => safeName.startsWith(prefix))) {
    throw new ServiceError(`Table name cannot start with reserved prefix: ${safeName}`);
  }

  return safeName;
}

function validateColumns(input: CreateTableInput): void {
  const seen = new Set<string>();
  for (const column of input.columns) {
    const safeName = assertSafeColumnName(column.name);
    if (systemColumns.has(safeName)) {
      throw new ServiceError(`Column name is reserved: ${safeName}`);
    }
    if (seen.has(safeName)) {
      throw new ServiceError(`Duplicate column name: ${safeName}`);
    }
    seen.add(safeName);
  }
}

export async function listTables(): Promise<ForgeTable[]> {
  const rows = await db.select().from(forgeTables);
  return rows.map((row) => toForgeTable(row));
}

export async function describeTable(tableName: string): Promise<ForgeTable> {
  const safeName = assertSafeTableName(tableName);
  const table = await db.select().from(forgeTables).where(eq(forgeTables.tableName, safeName)).limit(1);
  if (!table[0]) {
    throw new ServiceError(`Unknown table: ${safeName}`, 404);
  }

  const columns = await db
    .select()
    .from(forgeColumns)
    .where(eq(forgeColumns.tableId, table[0].id));

  return toForgeTable(table[0], columns.map((column) => toForgeColumn(column)));
}

export async function createTable(input: CreateTableInput): Promise<ForgeTable> {
  const parsed = createTableInputSchema.parse(input);
  const tableName = validateTableName(parsed.tableName);
  validateColumns(parsed);

  const existing = await db.select().from(forgeTables).where(eq(forgeTables.tableName, tableName)).limit(1);
  if (existing[0]) {
    throw new ServiceError(`Table already exists: ${tableName}`, 409);
  }

  const project = await ensureDefaultProject(db);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const columnSql = parsed.columns.map((column) => {
      const parts = [quoteIdentifier(column.name), columnTypeSql[column.type]];
      if (column.nullable === false) {
        parts.push("NOT NULL");
      }
      if (column.unique === true) {
        parts.push("UNIQUE");
      }
      return parts.join(" ");
    });

    const createSql = [
      `CREATE TABLE ${quoteIdentifier(tableName)} (`,
      [
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        ...columnSql,
        "created_at TIMESTAMPTZ DEFAULT now()",
        "updated_at TIMESTAMPTZ DEFAULT now()"
      ].join(", "),
      ")"
    ].join(" ");

    await client.query(createSql);

    const tableResult = await client.query<{ id: string; project_id: string; table_name: string; created_at: Date }>(
      "INSERT INTO forge_tables (project_id, table_name) VALUES ($1, $2) RETURNING id, project_id, table_name, created_at",
      [project.id, tableName]
    );

    const tableRow = tableResult.rows[0];
    if (!tableRow) {
      throw new ServiceError("Failed to store table metadata", 500);
    }

    for (const column of parsed.columns) {
      await client.query(
        "INSERT INTO forge_columns (table_id, column_name, column_type, nullable, is_unique) VALUES ($1, $2, $3, $4, $5)",
        [tableRow.id, column.name, column.type, column.nullable ?? true, column.unique ?? false]
      );
    }

    await client.query("COMMIT");
    return describeTable(tableName);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && "code" in error && error.code === "42P07") {
      throw new ServiceError(`Table already exists: ${tableName}`, 409);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getRegisteredColumns(tableName: string): Promise<ForgeColumn[]> {
  const safeName = assertSafeTableName(tableName);
  const rows = await db
    .select({ column: forgeColumns })
    .from(forgeTables)
    .innerJoin(forgeColumns, eq(forgeColumns.tableId, forgeTables.id))
    .where(and(eq(forgeTables.tableName, safeName)));

  if (rows.length === 0) {
    const table = await db.select().from(forgeTables).where(eq(forgeTables.tableName, safeName)).limit(1);
    if (!table[0]) {
      throw new ServiceError(`Unknown table: ${safeName}`, 404);
    }
  }

  return rows.map((row) => toForgeColumn(row.column));
}
