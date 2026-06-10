/**
 * Database Schema Definitions
 *
 * Defines the Drizzle ORM schema for the Localbase database.
 * Includes tables for projects, tables (resources), columns (fields), users, and sessions.
 * Also provides a helper function to ensure a default project exists.
 */

import { asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Projects table - top-level grouping for resources. */
export const forgeProjects = pgTable("forge_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

/** Tables (resources) table - defines user-created resources with ownership. */
export const forgeTables = pgTable("forge_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => forgeProjects.id),
  tableName: text("table_name").notNull(),
  ownedByUser: boolean("owned_by_user").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

/** Columns (fields) table - defines fields on resources with types and constraints. */
export const forgeColumns = pgTable("forge_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableId: uuid("table_id").references(() => forgeTables.id),
  columnName: text("column_name").notNull(),
  columnType: text("column_type").notNull(),
  nullable: boolean("nullable").default(true).notNull(),
  isUnique: boolean("is_unique").default(false).notNull(),
  defaultValue: text("default_value"),
  isIndexed: boolean("is_indexed").default(false).notNull(),
  referenceTable: text("reference_table"),
  referenceColumn: text("reference_column"),
  referenceOnDelete: text("reference_on_delete"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

/** Users table - stores email/password credentials for authentication. */
export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    // Ensure email uniqueness for authentication
    emailUnique: uniqueIndex("auth_users_email_unique").on(table.email)
  })
);

/** Sessions table - stores bearer token hashes for active user sessions. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => authUsers.id)
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    // Ensure token hash uniqueness for session lookup
    tokenHashUnique: uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash)
  })
);

/** Type alias for a project row as selected from the database. */
export type ForgeProjectRow = typeof forgeProjects.$inferSelect;

/**
 * Ensures that at least one project exists in the database.
 * Returns the first project found, or creates a "Default Project" if none exist.
 * @param database - The Drizzle database instance.
 * @returns The existing or newly created project row.
 */
export async function ensureDefaultProject(
  database: NodePgDatabase<typeof import("./forge.js")>
): Promise<ForgeProjectRow> {
  const existing = await database.select().from(forgeProjects).orderBy(asc(forgeProjects.createdAt)).limit(1);
  if (existing[0]) {
    return existing[0];
  }

  const created = await database
    .insert(forgeProjects)
    .values({ name: "Default Project" })
    .returning();

  return created[0];
}
