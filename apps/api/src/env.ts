/**
 * Environment Variables
 *
 * Loads and validates environment variables using Zod.
 * Provides a strongly typed env object with sensible defaults for development.
 * DATABASE_URL: PostgreSQL connection string
 * API_PORT: Port number for the HTTP server
 * API_BASE_URL: Public URL for the API
 * API_ADMIN_TOKEN: Optional bearer token for admin endpoints
 */

import "dotenv/config";
import { z } from "zod";

/** Zod schema defining and validating all required environment variables. */
const envSchema = z.object({
  DATABASE_URL: z.string().url().default("postgresql://localbase:localbase@localhost:5432/localbase"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  API_ADMIN_TOKEN: z.string().min(1).optional()
});

/**
 * Parsed and validated environment variables.
 * Throws a Zod error at startup if required variables are invalid.
 */
export const env = envSchema.parse(process.env);
