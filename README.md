# Backforge

Backforge is a local-first backend foundation inspired by InsForge. It lets AI coding agents manage PostgreSQL resources through an MCP server, exposes generic CRUD APIs, and includes a minimal email/password auth layer for user-owned data.

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
- `pnpm --silent mcp`: start the quiet MCP stdio server for agent clients.
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

Add a field to an existing resource:

```bash
curl -X POST http://localhost:4000/resources/companies/fields \
  -H "Content-Type: application/json" \
  -d '{"name":"description","type":"text"}'

curl -X POST http://localhost:4000/resources/companies/fields \
  -H "Content-Type: application/json" \
  -d '{"name":"rating","type":"integer","required":true,"defaultValue":0,"indexed":true}'
```

Create a user and save the bearer token:

```bash
TOKEN=$(
  curl -s -X POST http://localhost:4000/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"ada@example.com","password":"password123"}' |
    node -pe 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).token'
)
```

Create a user-owned resource:

```bash
curl -X POST http://localhost:4000/resources \
  -H "Content-Type: application/json" \
  -d '{"name":"todos","ownedByUser":true,"fields":[{"name":"title","type":"text","required":true},{"name":"done","type":"boolean","defaultValue":false}]}'
```

Insert and list owned rows with the token:

```bash
curl -X POST http://localhost:4000/resources/todos/rows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship auth","done":false}'

curl http://localhost:4000/resources/todos/rows \
  -H "Authorization: Bearer $TOKEN"
```

Owned resources automatically add `user_id`, reject client-supplied `user_id`, and only return rows for the authenticated user.

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

Start the API first, then configure your MCP client to launch the quiet MCP command:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev:api
```

Use `pnpm --silent mcp` for MCP clients. It avoids package-manager lifecycle output on stdout, which is important for stdio MCP.

Example MCP config:

```json
{
  "mcpServers": {
    "backforge": {
      "command": "pnpm",
      "args": ["--silent", "mcp"],
      "cwd": "/absolute/path/to/backforge",
      "env": {
        "API_BASE_URL": "http://localhost:4000"
      }
    }
  }
}
```

Local coding agents can call `get_backend_summary` first to verify the API is reachable and inspect existing backend state. They can then call resource tools such as `list_resources`, `describe_resource`, `create_resource`, `add_field`, `list_rows`, and `insert_row` over stdio. They can also call `describe_auth_config` to inspect auth behavior. Compatibility table tools are also available: `list_tables`, `describe_table`, and `create_table`.

For this checkout, replace `/absolute/path/to/backforge` with:

```text
/media/manan/27c2ac5b-0083-4cea-a027-e77fa8c01f85/Computer_Science/backforge
```

After connecting the MCP server in Codex, ask the agent:

```text
Use the backforge MCP server. Call get_backend_summary, then create a products resource with name text required, price integer required, and in_stock boolean default true.
```

The agent should call `create_resource` and `add_field`, not write SQL manually.

## SDK Example

```ts
import { createBackforgeClient } from "@backforge/sdk";

const forge = createBackforgeClient({ baseUrl: "http://localhost:4000" });

await forge.auth.signUp("ada@example.com", "password123");
await forge.auth.getUser();

await forge.resources.create({
  name: "todos",
  ownedByUser: true,
  fields: [
    { name: "title", type: "text", required: true },
    { name: "done", type: "boolean", defaultValue: false }
  ]
});
await forge.resources.list();
await forge.resources.describe("todos");
await forge.resources.addField("todos", { name: "priority", type: "integer", defaultValue: 0 });
await forge.resources.rows("todos").insert({ title: "Ship auth" });
await forge.resources.rows("todos").list();

await forge.from("companies").select();
await forge.from("companies").get("row-id");
await forge.from("companies").insert({ name: "Acme" });
await forge.from("companies").update("row-id", { name: "Acme Inc" });
await forge.from("companies").delete("row-id");
```
