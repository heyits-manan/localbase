ALTER TABLE "forge_columns" ADD COLUMN "default_value" text;--> statement-breakpoint
ALTER TABLE "forge_columns" ADD COLUMN "is_indexed" boolean DEFAULT false NOT NULL;