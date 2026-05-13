import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().default("postgresql://localbase:localbase@localhost:5432/localbase"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  API_ADMIN_TOKEN: z.string().min(1).optional()
});

export const env = envSchema.parse(process.env);
