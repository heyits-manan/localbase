/**
 * Database Client Setup
 *
 * Creates and exports the PostgreSQL connection pool and Drizzle ORM instance.
 * The pool manages database connections, and Drizzle provides a type-safe query builder.
 * Schema is passed to Drizzle for relational query support.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../env.js";
import * as schema from "./schema/forge.js";

const { Pool } = pg;

/** PostgreSQL connection pool for executing queries. */
export const pool = new Pool({
  connectionString: env.DATABASE_URL
});

/** Drizzle ORM instance with schema for type-safe queries. */
export const db = drizzle(pool, { schema });
