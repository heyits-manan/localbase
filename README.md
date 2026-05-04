# Backforge

Backforge is a local-first backend foundation inspired by InsForge. It lets AI coding agents manage PostgreSQL tables through an MCP server, exposes generic CRUD APIs, and leaves room for auth and storage later.

## Requirements

- Node.js 20+
- pnpm
- Docker

PostgreSQL runs through Docker Compose only. Do not install or configure PostgreSQL manually on your machine.

## Setup

1. Install Docker.
2. Run `docker compose up -d postgres`.
3. Run `pnpm install`.
4. Run `pnpm db:generate`.
5. Run `pnpm db:migrate`.
6. Run `pnpm dev:api`.

Copy `.env.example` to `.env` if you want local overrides. The default API database URL is:

```env
DATABASE_URL=postgresql://backforge:backforge@localhost:5432/backforge
```

## Development Commands

- `pnpm dev:api`: start the Express API on port `4000`.
- `pnpm dev:mcp`: start the MCP stdio server.
- `pnpm db:generate`: generate Drizzle migrations for internal metadata tables.
- `pnpm db:migrate`: apply Drizzle migrations.
- `pnpm db:studio`: open Drizzle Studio.
- `pnpm typecheck`: typecheck all workspace packages.
- `pnpm lint`: run TypeScript checks for this MVP.

## API Examples

Health check:

```bash
curl http://localhost:4000/health
```

Create a resource:

```bash
curl -X POST http://localhost:4000/resources \
  -H "Content-Type: application/json" \
  -d '{"name":"companies","fields":[{"name":"name","type":"text","required":true},{"name":"website","type":"text"},{"name":"active","type":"boolean","defaultValue":true,"indexed":true}]}'
```

Insert and list resource rows:

```bash
curl -X POST http://localhost:4000/resources/companies/rows \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","website":"https://acme.com"}'

curl http://localhost:4000/resources/companies/rows
```

The older table-oriented API remains available:

```bash
curl -X POST http://localhost:4000/schema/tables \
  -H "Content-Type: application/json" \
  -d '{"tableName":"companies","columns":[{"name":"name","type":"text","nullable":false},{"name":"website","type":"text","nullable":true}]}'
```

Insert and list rows:

```bash
curl -X POST http://localhost:4000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","website":"https://acme.com"}'

curl http://localhost:4000/api/companies
```

## MCP Use

Start the MCP server with `pnpm dev:mcp`. Local coding agents can call resource tools such as `list_resources`, `describe_resource`, `create_resource`, `list_rows`, and `insert_row` over stdio. Compatibility table tools are also available: `list_tables`, `describe_table`, and `create_table`. The MCP server calls the API using `API_BASE_URL`, defaulting to `http://localhost:4000`.

## SDK Example

```ts
import { createBackforgeClient } from "@backforge/sdk";

const forge = createBackforgeClient({ baseUrl: "http://localhost:4000" });

await forge.resources.create({
  name: "companies",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "website", type: "text" }
  ]
});
await forge.resources.list();
await forge.resources.describe("companies");
await forge.resources.rows("companies").insert({ name: "Acme" });
await forge.resources.rows("companies").list();

await forge.from("companies").select();
await forge.from("companies").get("row-id");
await forge.from("companies").insert({ name: "Acme" });
await forge.from("companies").update("row-id", { name: "Acme Inc" });
await forge.from("companies").delete("row-id");
```
