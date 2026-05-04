import { asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const forgeProjects = pgTable("forge_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const forgeTables = pgTable("forge_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => forgeProjects.id),
  tableName: text("table_name").notNull(),
  ownedByUser: boolean("owned_by_user").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const forgeColumns = pgTable("forge_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableId: uuid("table_id").references(() => forgeTables.id),
  columnName: text("column_name").notNull(),
  columnType: text("column_type").notNull(),
  nullable: boolean("nullable").default(true).notNull(),
  isUnique: boolean("is_unique").default(false).notNull(),
  defaultValue: text("default_value"),
  isIndexed: boolean("is_indexed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    emailUnique: uniqueIndex("auth_users_email_unique").on(table.email)
  })
);

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
    tokenHashUnique: uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash)
  })
);

export type ForgeProjectRow = typeof forgeProjects.$inferSelect;

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
