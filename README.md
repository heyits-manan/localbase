# Localbase

[demo.webm](https://github.com/user-attachments/assets/a16494e0-9075-449a-8ead-c95243689839)

Localbase is a local-first backend runtime for AI coding agents. It runs a local Postgres-backed API, exposes generic CRUD and auth endpoints, and gives Codex an MCP server so agents can create resources, fields, indexes, relationships, rows, and user-owned data through structured tools.

Data stays in the generated project on the user's machine by default. Hosted or managed backends can be added later as an explicit opt-in mode, but the default path is local Docker, local API, and local MCP.

## Quick Start

Requirements:

- Node.js 20+
- Docker

Install the CLI:

```bash
npm install -g @mrace07/localbase
```

Create and start a local backend:

```bash
localbase init my-backend
cd my-backend
localbase start
localbase agent codex --install
localbase doctor
```

Then restart Codex from a shell where `docker ps` works and ask:

```text
Use the localbase MCP server. Call get_backend_summary, then list resources.
```

You can also scaffold without installing globally first:

```bash
npx @mrace07/localbase init my-backend
cd my-backend
npm install -g @mrace07/localbase
localbase start
```

`init` only writes project files. `start` runs the Docker Compose runtime. `agent codex --install` registers the generated project as Codex's `localbase` MCP server. `doctor` checks Docker access, Compose, API health, Docker images, and Codex MCP registration.

Generated projects include a `.env` with an `API_ADMIN_TOKEN`. Schema-changing API routes require this token when it is set.

## CLI Commands

```bash
localbase init [directory] [--force] [--with-web] [--local-images] [--api-port <port>] [--web-port <port>] [--image-tag <tag>]
localbase start
localbase stop
localbase status
localbase mcp [--project <directory>]
localbase agent codex [--install]
localbase doctor
```

- `init`: scaffold a local-first project with `.env`, `.gitignore`, `docker-compose.yml`, `localbase.config.json`, and a project README.
- `start`: start the generated Docker Compose runtime.
- `stop`: stop the generated Docker Compose runtime.
- `status`: show Compose service status.
- `mcp`: run the MCP stdio server for a generated project.
- `agent codex`: print or install Codex MCP setup for the project.
- `doctor`: check the local runtime and Codex MCP registration.

Generated projects use Docker images from Docker Hub:

- `mananchataut/localbase-api:latest`
- `mananchataut/localbase-mcp:latest`

Those tags are multi-platform Linux images, so Docker pulls the right variant on macOS, Windows, and Linux.

## API Examples

From a generated project, load the admin token:

```bash
export API_ADMIN_TOKEN="$(grep '^API_ADMIN_TOKEN=' .env | cut -d= -f2-)"
```

Health check:

```bash
curl http://localhost:4000/health
```

Create a resource:

```bash
curl -X POST http://localhost:4000/resources \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"companies","fields":[{"name":"name","type":"text","required":true},{"name":"website","type":"text"},{"name":"active","type":"boolean","defaultValue":true,"indexed":true}]}'
```

Insert and list rows:

```bash
curl -X POST http://localhost:4000/resources/companies/rows \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","website":"https://acme.com"}'

curl http://localhost:4000/resources/companies/rows
```

Add fields and indexes:

```bash
curl -X POST http://localhost:4000/resources/companies/fields \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"rating","type":"integer","required":true,"defaultValue":0,"indexed":true}'

curl -X POST http://localhost:4000/resources/companies/indexes \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"active"}'
```

Create a relationship field:

```bash
curl -X POST http://localhost:4000/resources/companies/relationships \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"parent_company_id","references":{"resource":"companies","field":"id","onDelete":"set null"}}'
```

Filter listed rows:

```bash
curl 'http://localhost:4000/resources/companies/rows?where[active]=true'
curl 'http://localhost:4000/resources/companies/rows?where[name][contains]=acme&orderBy=created_at&orderDirection=desc&limit=25&offset=0'
```

Supported filter operators are `eq`, `ne`, `contains`, `gt`, `gte`, `lt`, `lte`, and `isNull`. The shorthand `where[field]=value` is equivalent to `where[field][eq]=value`.

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
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"todos","ownedByUser":true,"fields":[{"name":"title","type":"text","required":true},{"name":"done","type":"boolean","defaultValue":false}]}'
```

Insert and list owned rows with the user token:

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

For generated projects, install the Codex MCP registration from the project directory:

```bash
localbase agent codex --install
codex mcp get localbase
```

The registration should point at the generated project:

```text
command: localbase
args: mcp --project /path/to/your/project
```

Agents can call `get_backend_summary` first to verify the API is reachable. Available tools include `list_resources`, `describe_resource`, `create_resource`, `delete_resource`, `add_field`, `update_field`, `delete_field`, `add_index`, `create_relationship`, `list_rows`, `insert_row`, `get_row`, `update_row`, `delete_row`, `describe_auth_config`, `sign_up`, `sign_in`, `get_current_user`, and `sign_out`.

## SDK Example

```ts
import { createLocalbaseClient } from "@localbase/sdk";

const localbase = createLocalbaseClient({
  baseUrl: "http://localhost:4000",
  adminToken: process.env.API_ADMIN_TOKEN
});

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
await localbase.resources.addField("todos", { name: "priority", type: "integer", defaultValue: 0 });
await localbase.resources.addIndex("todos", "priority");
await localbase.resources.rows("todos").insert({ title: "Ship auth" });
await localbase.resources.rows("todos").list({
  where: { priority: { gte: 0 }, title: { contains: "Ship" } },
  limit: 25,
  orderBy: "created_at",
  orderDirection: "desc"
});
```

## Repository Development

Requirements for working on this repo:

- Node.js 20+
- pnpm
- Docker

PostgreSQL runs through Docker Compose. Do not install or configure PostgreSQL manually for local development.

```bash
docker compose up -d postgres
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev:api
```

Copy `.env.example` to `.env` if you want local overrides. The default API database URL is:

```env
DATABASE_URL=postgresql://localbase:localbase@localhost:5432/localbase
```

Development commands:

- `pnpm dev:api`: start the Express API on port `4000`.
- `pnpm dev:mcp`: start the MCP stdio server.
- `pnpm --silent mcp`: start the quiet repo-local MCP stdio server.
- `pnpm db:generate`: generate Drizzle migrations for internal metadata tables.
- `pnpm db:migrate`: apply Drizzle migrations.
- `pnpm db:studio`: open Drizzle Studio.
- `pnpm test`: run workspace tests.
- `pnpm typecheck`: typecheck all workspace packages.
- `pnpm lint`: run TypeScript checks.

## Release Notes

Publish and verify runtime images before publishing the npm package:

```bash
docker login
pnpm docker:publish
docker buildx imagetools inspect mananchataut/localbase-api:latest
docker buildx imagetools inspect mananchataut/localbase-mcp:latest
```

Then publish the CLI package from `packages/cli`:

```bash
pnpm --filter @mrace07/localbase lint
pnpm --filter @mrace07/localbase publish --access public
```
