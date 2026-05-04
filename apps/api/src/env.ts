import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().default("postgresql://backforge:backforge@localhost:5432/backforge"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000")
});

export const env = envSchema.parse(process.env);
