import type {
  AddResourceFieldInput,
  AddResourceIndexInput,
  ColumnType,
  CreateResourceInput,
  CreateTableInput,
  ForgeColumn,
  ForgeResource,
  ForgeTable
} from "@backforge/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../db/client.js";
import { ensureDefaultProject, forgeColumns, forgeTables } from "../db/schema/forge.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

const columnTypes = ["text", "integer", "boolean", "timestamp", "uuid", "jsonb"] as const;
const reservedPrefixes = ["forge_", "auth_", "storage_"];
const systemColumns = new Set(["id", "created_at", "updated_at"]);
const reservedResourceFieldNames = new Set(["id", "user_id", "created_at", "updated_at"]);

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
  ownedByUser: z.boolean().optional(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(columnTypes),
        nullable: z.boolean().optional(),
        unique: z.boolean().optional(),
        defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        indexed: z.boolean().optional()
      })
    )
    .default([])
});

export const createResourceInputSchema = z.object({
  name: z.string().min(1),
  ownedByUser: z.boolean().optional(),
  fields: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(columnTypes),
        required: z.boolean().optional(),
        unique: z.boolean().optional(),
        defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
        indexed: z.boolean().optional()
      })
    )
    .default([])
});

export const addResourceFieldInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(columnTypes),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  indexed: z.boolean().optional()
});

export const addResourceIndexInputSchema = z.object({
  field: z.string().min(1)
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
    defaultValue: row.defaultValue,
    isIndexed: row.isIndexed,
    createdAt: row.createdAt.toISOString()
  };
}

function toForgeTable(row: typeof forgeTables.$inferSelect, columns?: ForgeColumn[]): ForgeTable {
  return {
    id: row.id,
    projectId: row.projectId ?? "",
    tableName: row.tableName,
    ownedByUser: row.ownedByUser,
    createdAt: row.createdAt.toISOString(),
    columns
  };
}

function toForgeResource(table: ForgeTable): ForgeResource {
  return {
    id: table.id,
    projectId: table.projectId,
    name: table.tableName,
    tableName: table.tableName,
    ownedByUser: table.ownedByUser,
    createdAt: table.createdAt,
    fields: table.columns
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

function validateResourceFieldName(fieldName: string): string {
  const safeName = assertSafeColumnName(fieldName);
  if (reservedResourceFieldNames.has(safeName)) {
    throw new ServiceError(`Field name is reserved: ${safeName}`);
  }

  return safeName;
}

function toSqlLiteral(type: ColumnType, value: string | number | boolean | null): string {
  if (value === null) {
    return "NULL";
  }

  if (type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new ServiceError("Integer default values must be whole numbers");
    }
    return String(value);
  }

  if (type === "boolean") {
    if (typeof value !== "boolean") {
      throw new ServiceError("Boolean default values must be true or false");
    }
    return value ? "true" : "false";
  }

  if ((type === "timestamp" || type === "uuid") && typeof value !== "string") {
    throw new ServiceError(`${type} default values must be strings`);
  }

  if (type === "jsonb") {
    const escaped = JSON.stringify(value).replace(/'/g, "''");
    return `'${escaped}'::jsonb`;
  }

  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

function toColumnSql(column: CreateTableInput["columns"][number]): string {
  const parts = [quoteIdentifier(column.name), columnTypeSql[column.type]];
  if (column.nullable === false) {
    parts.push("NOT NULL");
  }
  if (column.name === "user_id") {
    parts.push("REFERENCES auth_users(id)");
  }
  if (column.unique === true) {
    parts.push("UNIQUE");
  }
  if (column.defaultValue !== undefined) {
    if (column.nullable === false && column.defaultValue === null) {
      throw new ServiceError(`Required column cannot default to null: ${column.name}`);
    }
    parts.push("DEFAULT", toSqlLiteral(column.type, column.defaultValue));
  }
  return parts.join(" ");
}

async function createColumnIndex(
  client: Pick<typeof pool, "query">,
  tableName: string,
  columnName: string
): Promise<void> {
  const indexName = `${tableName}_${columnName}_idx`;
  await client.query(
    `CREATE INDEX ${quoteIdentifier(indexName)} ON ${quoteIdentifier(tableName)} (${quoteIdentifier(columnName)})`
  );
}

function toResourceInput(input: CreateResourceInput): CreateTableInput {
  const parsed = createResourceInputSchema.parse(input);
  return {
    tableName: parsed.name,
    ...(parsed.ownedByUser === undefined ? {} : { ownedByUser: parsed.ownedByUser }),
    columns: [
      ...(parsed.ownedByUser === true
        ? [
            {
              name: "user_id",
              type: "uuid" as const,
              nullable: false,
              indexed: true
            }
          ]
        : []),
      ...parsed.fields.map((field) => ({
        name: field.name,
        type: field.type,
        nullable: field.required === true ? false : true,
        ...(field.unique === undefined ? {} : { unique: field.unique }),
        ...(field.defaultValue === undefined ? {} : { defaultValue: field.defaultValue }),
        ...(field.indexed === undefined ? {} : { indexed: field.indexed })
      }))
    ]
  };
}

export async function listTables(): Promise<ForgeTable[]> {
  const rows = await db.select().from(forgeTables);
  return rows.map((row) => toForgeTable(row));
}

export async function listResources(): Promise<ForgeResource[]> {
  const tables = await listTables();
  return tables.map((table) => toForgeResource(table));
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

export async function describeResource(name: string): Promise<ForgeResource> {
  return toForgeResource(await describeTable(name));
}

export async function createTable(input: CreateTableInput): Promise<ForgeTable> {
  const parsed = createTableInputSchema.parse(input);
  const tableName = validateTableName(parsed.tableName);
  const normalizedInput: CreateTableInput = {
    tableName: parsed.tableName,
    ...(parsed.ownedByUser === undefined ? {} : { ownedByUser: parsed.ownedByUser }),
    columns:
      parsed.ownedByUser === true && !parsed.columns.some((column) => column.name === "user_id")
        ? [
            {
              name: "user_id",
              type: "uuid",
              nullable: false,
              indexed: true
            },
            ...parsed.columns
          ]
        : parsed.columns
  };
  validateColumns(normalizedInput);

  const existing = await db.select().from(forgeTables).where(eq(forgeTables.tableName, tableName)).limit(1);
  if (existing[0]) {
    throw new ServiceError(`Table already exists: ${tableName}`, 409);
  }

  const project = await ensureDefaultProject(db);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const columnSql = normalizedInput.columns.map((column) => toColumnSql(column));

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

    for (const column of normalizedInput.columns) {
      if (column.indexed === true && column.unique !== true) {
        await createColumnIndex(client, tableName, column.name);
      }
    }

    const tableResult = await client.query<{
      id: string;
      project_id: string;
      table_name: string;
      owned_by_user: boolean;
      created_at: Date;
    }>(
      "INSERT INTO forge_tables (project_id, table_name, owned_by_user) VALUES ($1, $2, $3) RETURNING id, project_id, table_name, owned_by_user, created_at",
      [project.id, tableName, normalizedInput.ownedByUser ?? false]
    );

    const tableRow = tableResult.rows[0];
    if (!tableRow) {
      throw new ServiceError("Failed to store table metadata", 500);
    }

    for (const column of normalizedInput.columns) {
      await client.query(
        "INSERT INTO forge_columns (table_id, column_name, column_type, nullable, is_unique, default_value, is_indexed) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          tableRow.id,
          column.name,
          column.type,
          column.nullable ?? true,
          column.unique ?? false,
          column.defaultValue === undefined ? null : String(column.defaultValue),
          column.indexed ?? false
        ]
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

export async function createResource(input: CreateResourceInput): Promise<ForgeResource> {
  return toForgeResource(await createTable(toResourceInput(input)));
}

export async function addResourceField(resourceName: string, input: AddResourceFieldInput): Promise<ForgeResource> {
  const tableName = assertSafeTableName(resourceName);
  const parsed = addResourceFieldInputSchema.parse(input);
  const fieldName = validateResourceFieldName(parsed.name);
  const resource = await describeResource(tableName);
  const existingFields = resource.fields ?? [];
  if (existingFields.some((field) => field.columnName === fieldName)) {
    throw new ServiceError(`Field already exists: ${fieldName}`, 409);
  }

  const column = {
    name: fieldName,
    type: parsed.type,
    nullable: parsed.required === true ? false : true,
    ...(parsed.unique === undefined ? {} : { unique: parsed.unique }),
    ...(parsed.defaultValue === undefined ? {} : { defaultValue: parsed.defaultValue }),
    ...(parsed.indexed === undefined ? {} : { indexed: parsed.indexed })
  } satisfies CreateTableInput["columns"][number];

  if (column.nullable === false && column.defaultValue === undefined) {
    throw new ServiceError(`Required field must include a non-null default value: ${fieldName}`);
  }
  if (column.nullable === false && column.defaultValue === null) {
    throw new ServiceError(`Required field cannot default to null: ${fieldName}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${toColumnSql(column)}`);

    if (column.indexed === true && column.unique !== true) {
      await createColumnIndex(client, tableName, column.name);
    }

    await client.query(
      "INSERT INTO forge_columns (table_id, column_name, column_type, nullable, is_unique, default_value, is_indexed) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        resource.id,
        column.name,
        column.type,
        column.nullable,
        column.unique ?? false,
        column.defaultValue === undefined ? null : String(column.defaultValue),
        column.indexed ?? false
      ]
    );

    await client.query("COMMIT");
    return describeResource(tableName);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && "code" in error && error.code === "42701") {
      throw new ServiceError(`Field already exists: ${fieldName}`, 409);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addResourceIndex(resourceName: string, input: AddResourceIndexInput): Promise<ForgeResource> {
  const tableName = assertSafeTableName(resourceName);
  const parsed = addResourceIndexInputSchema.parse(input);
  const fieldName = validateResourceFieldName(parsed.field);
  const resource = await describeResource(tableName);
  const field = resource.fields?.find((candidate) => candidate.columnName === fieldName);
  if (!field) {
    throw new ServiceError(`Unknown field: ${fieldName}`, 404);
  }
  if (field.isIndexed || field.isUnique) {
    return resource;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await createColumnIndex(client, tableName, fieldName);
    await client.query("UPDATE forge_columns SET is_indexed = true WHERE table_id = $1 AND column_name = $2", [
      resource.id,
      fieldName
    ]);
    await client.query("COMMIT");
    return describeResource(tableName);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && "code" in error && error.code === "42P07") {
      await db
        .update(forgeColumns)
        .set({ isIndexed: true })
        .where(and(eq(forgeColumns.tableId, resource.id), eq(forgeColumns.columnName, fieldName)));
      return describeResource(tableName);
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
