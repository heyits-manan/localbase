import type {
  AddResourceFieldInput,
  AddResourceIndexInput,
  CreateResourceInput,
  FieldType,
  LocalbaseField,
  LocalbaseResource
} from "@localbase/shared";
import {
  addResourceFieldInputSchema,
  addResourceIndexInputSchema,
  createResourceInputSchema
} from "@localbase/shared";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { ensureDefaultProject, forgeColumns, forgeTables } from "../db/schema/forge.js";
import { assertSafeColumnName, assertSafeTableName, quoteIdentifier } from "../utils/sql-identifiers.js";

const reservedPrefixes = ["forge_", "auth_", "storage_"];
const reservedResourceFieldNames = new Set(["id", "user_id", "created_at", "updated_at"]);

const fieldTypeSql: Record<FieldType, string> = {
  text: "TEXT",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  timestamp: "TIMESTAMPTZ",
  uuid: "UUID",
  jsonb: "JSONB"
};

type StorageFieldInput = {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: string | number | boolean | null;
  indexed?: boolean;
};

class ServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toLocalbaseField(row: typeof forgeColumns.$inferSelect): LocalbaseField {
  return {
    id: row.id,
    resourceId: row.tableId ?? "",
    name: row.columnName,
    type: row.columnType as FieldType,
    required: !row.nullable,
    isUnique: row.isUnique,
    defaultValue: row.defaultValue,
    isIndexed: row.isIndexed,
    createdAt: row.createdAt.toISOString()
  };
}

function toLocalbaseResource(row: typeof forgeTables.$inferSelect, fields?: LocalbaseField[]): LocalbaseResource {
  return {
    id: row.id,
    projectId: row.projectId ?? "",
    name: row.tableName,
    ownedByUser: row.ownedByUser,
    createdAt: row.createdAt.toISOString(),
    fields
  };
}

function validateResourceName(resourceName: string): string {
  const safeName = assertSafeTableName(resourceName);
  if (reservedPrefixes.some((prefix) => safeName.startsWith(prefix))) {
    throw new ServiceError(`Resource name cannot start with reserved prefix: ${safeName}`);
  }

  return safeName;
}

function validateResourceFieldName(fieldName: string): string {
  const safeName = assertSafeColumnName(fieldName);
  if (reservedResourceFieldNames.has(safeName)) {
    throw new ServiceError(`Field name is reserved: ${safeName}`);
  }

  return safeName;
}

function validateResourceFields(fields: StorageFieldInput[]): StorageFieldInput[] {
  const seen = new Set<string>();

  return fields.map((field) => {
    const safeName = validateResourceFieldName(field.name);
    if (seen.has(safeName)) {
      throw new ServiceError(`Duplicate field name: ${safeName}`);
    }
    seen.add(safeName);

    return { ...field, name: safeName };
  });
}

function toSqlLiteral(type: FieldType, value: string | number | boolean | null): string {
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

function toFieldSql(field: StorageFieldInput): string {
  const parts = [quoteIdentifier(field.name), fieldTypeSql[field.type]];
  if (field.required === true) {
    parts.push("NOT NULL");
  }
  if (field.name === "user_id") {
    parts.push("REFERENCES auth_users(id)");
  }
  if (field.unique === true) {
    parts.push("UNIQUE");
  }
  if (field.defaultValue !== undefined) {
    if (field.required === true && field.defaultValue === null) {
      throw new ServiceError(`Required field cannot default to null: ${field.name}`);
    }
    parts.push("DEFAULT", toSqlLiteral(field.type, field.defaultValue));
  }
  return parts.join(" ");
}

async function createFieldIndex(
  client: Pick<typeof pool, "query">,
  resourceName: string,
  fieldName: string
): Promise<void> {
  const indexName = `${resourceName}_${fieldName}_idx`;
  await client.query(
    `CREATE INDEX ${quoteIdentifier(indexName)} ON ${quoteIdentifier(resourceName)} (${quoteIdentifier(fieldName)})`
  );
}

function getStorageFields(input: CreateResourceInput): StorageFieldInput[] {
  const userFields = validateResourceFields(input.fields);
  return [
    ...(input.ownedByUser === true
      ? [
          {
            name: "user_id",
            type: "uuid" as const,
            required: true,
            indexed: true
          }
        ]
      : []),
    ...userFields
  ];
}

export async function listResources(): Promise<LocalbaseResource[]> {
  const rows = await db.select().from(forgeTables);
  return rows.map((row) => toLocalbaseResource(row));
}

export async function describeResource(resourceName: string): Promise<LocalbaseResource> {
  const safeName = assertSafeTableName(resourceName);
  const resource = await db.select().from(forgeTables).where(eq(forgeTables.tableName, safeName)).limit(1);
  if (!resource[0]) {
    throw new ServiceError(`Unknown resource: ${safeName}`, 404);
  }

  const fields = await db
    .select()
    .from(forgeColumns)
    .where(eq(forgeColumns.tableId, resource[0].id));

  return toLocalbaseResource(resource[0], fields.map((field) => toLocalbaseField(field)));
}

export async function createResource(input: CreateResourceInput): Promise<LocalbaseResource> {
  const parsed = createResourceInputSchema.parse(input);
  const resourceName = validateResourceName(parsed.name);
  const fields = getStorageFields(parsed);

  const existing = await db.select().from(forgeTables).where(eq(forgeTables.tableName, resourceName)).limit(1);
  if (existing[0]) {
    throw new ServiceError(`Resource already exists: ${resourceName}`, 409);
  }

  const project = await ensureDefaultProject(db);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const fieldSql = fields.map((field) => toFieldSql(field));
    const createSql = [
      `CREATE TABLE ${quoteIdentifier(resourceName)} (`,
      [
        "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        ...fieldSql,
        "created_at TIMESTAMPTZ DEFAULT now()",
        "updated_at TIMESTAMPTZ DEFAULT now()"
      ].join(", "),
      ")"
    ].join(" ");

    await client.query(createSql);

    for (const field of fields) {
      if (field.indexed === true && field.unique !== true) {
        await createFieldIndex(client, resourceName, field.name);
      }
    }

    const resourceResult = await client.query<{
      id: string;
      project_id: string;
      table_name: string;
      owned_by_user: boolean;
      created_at: Date;
    }>(
      "INSERT INTO forge_tables (project_id, table_name, owned_by_user) VALUES ($1, $2, $3) RETURNING id, project_id, table_name, owned_by_user, created_at",
      [project.id, resourceName, parsed.ownedByUser ?? false]
    );

    const resourceRow = resourceResult.rows[0];
    if (!resourceRow) {
      throw new ServiceError("Failed to store resource metadata", 500);
    }

    for (const field of fields) {
      await client.query(
        "INSERT INTO forge_columns (table_id, column_name, column_type, nullable, is_unique, default_value, is_indexed) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          resourceRow.id,
          field.name,
          field.type,
          field.required === true ? false : true,
          field.unique ?? false,
          field.defaultValue === undefined ? null : String(field.defaultValue),
          field.indexed ?? false
        ]
      );
    }

    await client.query("COMMIT");
    return describeResource(resourceName);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && "code" in error && error.code === "42P07") {
      throw new ServiceError(`Resource already exists: ${resourceName}`, 409);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function addResourceField(resourceName: string, input: AddResourceFieldInput): Promise<LocalbaseResource> {
  const safeResourceName = assertSafeTableName(resourceName);
  const parsed = addResourceFieldInputSchema.parse(input);
  const fieldName = validateResourceFieldName(parsed.name);
  const resource = await describeResource(safeResourceName);
  const existingFields = resource.fields ?? [];
  if (existingFields.some((field) => field.name === fieldName)) {
    throw new ServiceError(`Field already exists: ${fieldName}`, 409);
  }

  const field = {
    ...parsed,
    name: fieldName
  } satisfies StorageFieldInput;

  if (field.required === true && field.defaultValue === undefined) {
    throw new ServiceError(`Required field must include a non-null default value: ${fieldName}`);
  }
  if (field.required === true && field.defaultValue === null) {
    throw new ServiceError(`Required field cannot default to null: ${fieldName}`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`ALTER TABLE ${quoteIdentifier(safeResourceName)} ADD COLUMN ${toFieldSql(field)}`);

    if (field.indexed === true && field.unique !== true) {
      await createFieldIndex(client, safeResourceName, field.name);
    }

    await client.query(
      "INSERT INTO forge_columns (table_id, column_name, column_type, nullable, is_unique, default_value, is_indexed) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        resource.id,
        field.name,
        field.type,
        field.required === true ? false : true,
        field.unique ?? false,
        field.defaultValue === undefined ? null : String(field.defaultValue),
        field.indexed ?? false
      ]
    );

    await client.query("COMMIT");
    return describeResource(safeResourceName);
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

export async function addResourceIndex(resourceName: string, input: AddResourceIndexInput): Promise<LocalbaseResource> {
  const safeResourceName = assertSafeTableName(resourceName);
  const parsed = addResourceIndexInputSchema.parse(input);
  const fieldName = validateResourceFieldName(parsed.field);
  const resource = await describeResource(safeResourceName);
  const field = resource.fields?.find((candidate) => candidate.name === fieldName);
  if (!field) {
    throw new ServiceError(`Unknown field: ${fieldName}`, 404);
  }
  if (field.isIndexed || field.isUnique) {
    return resource;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await createFieldIndex(client, safeResourceName, fieldName);
    await client.query("UPDATE forge_columns SET is_indexed = true WHERE table_id = $1 AND column_name = $2", [
      resource.id,
      fieldName
    ]);
    await client.query("COMMIT");
    return describeResource(safeResourceName);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && "code" in error && error.code === "42P07") {
      await db
        .update(forgeColumns)
        .set({ isIndexed: true })
        .where(and(eq(forgeColumns.tableId, resource.id), eq(forgeColumns.columnName, fieldName)));
      return describeResource(safeResourceName);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getRegisteredFields(resourceName: string): Promise<LocalbaseField[]> {
  const safeName = assertSafeTableName(resourceName);
  const rows = await db
    .select({ field: forgeColumns })
    .from(forgeTables)
    .innerJoin(forgeColumns, eq(forgeColumns.tableId, forgeTables.id))
    .where(and(eq(forgeTables.tableName, safeName)));

  if (rows.length === 0) {
    const resource = await db.select().from(forgeTables).where(eq(forgeTables.tableName, safeName)).limit(1);
    if (!resource[0]) {
      throw new ServiceError(`Unknown resource: ${safeName}`, 404);
    }
  }

  return rows.map((row) => toLocalbaseField(row.field));
}
