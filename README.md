# Localbase

[demo.webm](https://github.com/user-attachments/assets/a16494e0-9075-449a-8ead-c95243689839)


Localbase is a local-first backend foundation inspired by InsForge. It lets AI coding agents manage PostgreSQL resources through an MCP server, exposes generic CRUD APIs, and includes a minimal email/password auth layer for user-owned data.

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
DATABASE_URL=postgresql://localbase:localbase@localhost:5432/localbase
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

## Packaging Direction

Localbase is local-first. The planned `npx @mrace07/localbase init` flow should bootstrap a local workspace and run the local stack: Docker Postgres, the API, and the MCP stdio server. It should not default to a hosted API.

Hosted or managed backends can be added later as an explicit opt-in mode, but the default developer path should keep data and schema operations on the user's machine.

The intended packaged workflow is:

```bash
npx @mrace07/localbase init my-backend
cd my-backend
localbase start
localbase agent codex --install
```

`init` only writes the local project files. `start` runs the Docker Compose runtime. `agent codex --install` registers the MCP server with Codex for that project. `localbase doctor` checks Docker access, API health, image availability, and Codex MCP registration.

Published Docker images:

- `mananchataut/localbase-api`
- `mananchataut/localbase-mcp`

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

Get, update, and delete a resource row:

```bash
curl http://localhost:4000/resources/companies/rows/row-id

curl -X PATCH http://localhost:4000/resources/companies/rows/row-id \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Inc"}'

curl -X DELETE http://localhost:4000/resources/companies/rows/row-id
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

Rename or update a field:

```bash
curl -X PATCH http://localhost:4000/resources/companies/fields/description \
  -H "Content-Type: application/json" \
  -d '{"name":"summary","defaultValue":"", "indexed":true}'
```

Delete a field:

```bash
curl -X DELETE http://localhost:4000/resources/companies/fields/summary
```

Add an index to an existing field:

```bash
curl -X POST http://localhost:4000/resources/companies/indexes \
  -H "Content-Type: application/json" \
  -d '{"field":"active"}'
```

Filter listed rows:

```bash
curl 'http://localhost:4000/resources/companies/rows?where[active]=true'
curl 'http://localhost:4000/resources/companies/rows?where[name][contains]=acme&orderBy=created_at&orderDirection=desc&limit=25&offset=0'
```

Supported filter operators are `eq`, `ne`, `contains`, `gt`, `gte`, `lt`, `lte`, and `isNull`. The shorthand `where[field]=value` is equivalent to `where[field][eq]=value`.

Delete a resource:

```bash
curl -X DELETE http://localhost:4000/resources/companies
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
    "localbase": {
      "command": "pnpm",
      "args": ["--silent", "mcp"],
      "cwd": "/absolute/path/to/localbase",
      "env": {
        "API_BASE_URL": "http://localhost:4000"
      }
    }
  }
}
```

Local coding agents can call `get_backend_summary` first to verify the API is reachable and inspect existing backend state. They can then call resource tools such as `list_resources`, `describe_resource`, `create_resource`, `delete_resource`, `add_field`, `update_field`, `delete_field`, `add_index`, `list_rows`, `insert_row`, `get_row`, `update_row`, and `delete_row` over stdio. They can also call `describe_auth_config`, `sign_up`, `sign_in`, `get_current_user`, and `sign_out` for auth behavior.

For this checkout, replace `/absolute/path/to/localbase` with the absolute path to your repository checkout.

After connecting the MCP server in Codex, ask the agent:

```text
Use the localbase MCP server. Call get_backend_summary, then create a products resource with name text required, price integer required, and in_stock boolean default true.
```

The agent should call `create_resource`, `add_field`, and `add_index`, not write SQL manually.

## SDK Example

```ts
import { createLocalbaseClient } from "@localbase/sdk";

const localbase = createLocalbaseClient({ baseUrl: "http://localhost:4000" });

await localbase.auth.signUp("ada@example.com", "password123");
await localbase.auth.getUser();

await localbase.resources.create({
  name: "todos",
  ownedByUser: true,
  fields: [
    { name: "title", type: "text", required: true },
    { name: "done", type: "boolean", defaultValue: false }
  ]
});
await localbase.resources.list();
await localbase.resources.describe("todos");
await localbase.resources.addField("todos", { name: "priority", type: "integer", defaultValue: 0 });
await localbase.resources.updateField("todos", "priority", { indexed: true });
await localbase.resources.addIndex("todos", "priority");
await localbase.resources.rows("todos").insert({ title: "Ship auth" });
await localbase.resources.rows("todos").list({
  where: { priority: { gte: 0 }, title: { contains: "Ship" } },
  limit: 25,
  orderBy: "created_at",
  orderDirection: "desc"
});
await localbase.resources.rows("todos").get("row-id");
await localbase.resources.rows("todos").update("row-id", { done: true });
await localbase.resources.rows("todos").delete("row-id");
await localbase.resources.deleteField("todos", "priority");
await localbase.resources.delete("todos");
```
