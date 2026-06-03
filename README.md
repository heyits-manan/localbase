# Localbase

[demo.webm](https://github.com/user-attachments/assets/a16494e0-9075-449a-8ead-c95243689839)

Localbase creates local Postgres backends your AI coding agent can build and operate. It runs a local API, exposes generic CRUD and email/password auth, and gives Codex an MCP server so agents can create resources, fields, indexes, relationships, rows, and auth-owned data through structured tools.

AI agents need somewhere reliable to put application state. Localbase gives them a narrow backend tool surface instead of ad hoc SQL or one-off mock data, while keeping data in a generated project on your machine by default. Hosted or managed backends can be added later as an explicit opt-in mode, but the current path is local Docker, local API, and local MCP.

## Quick Start

Requirements:

- Node.js 20+
- Docker

Install the CLI:

```bash
npm install -g @mrace07/localbase
```

Create, start, and connect a local backend:

```bash
localbase init my-backend
cd my-backend
localbase start
localbase agent codex --install
```

Then restart Codex from a shell where `docker ps` works and ask:

```text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
```

Run `localbase doctor` if the API or MCP registration does not behave as expected.

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

## Flagship Demo: AI Memory Backend

Use this canonical prompt after `localbase agent codex --install`:

```text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
```

The intended schema is:

- `users`: created through existing email/password auth.
- `memories`: auth-owned rows with `title`, `content`, `source`, `importance`, and `created_at`.
- `documents`: auth-owned rows with `title`, `url`, `body`, and `status`.
- `conversations`: auth-owned rows with `title` and `summary`.
- `citations`: rows related to `documents` with `quote` and `note`.
- `outputs`: auth-owned rows with `title`, `kind`, and `content`.

Useful indexes include `memories.importance`, `memories.source`, `documents.status`, `conversations.title`, and `outputs.kind`.

## API Examples

From a generated project, load the admin token:

```bash
export API_ADMIN_TOKEN="$(grep '^API_ADMIN_TOKEN=' .env | cut -d= -f2-)"
```

Health check:

```bash
curl http://localhost:4000/health
```

Create an auth-owned `memories` resource:

```bash
curl -X POST http://localhost:4000/resources \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"memories","ownedByUser":true,"fields":[{"name":"title","type":"text","required":true},{"name":"content","type":"text","required":true},{"name":"source","type":"text","indexed":true},{"name":"importance","type":"integer","defaultValue":1,"indexed":true}]}'
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

Insert and list rows:

```bash
curl -X POST http://localhost:4000/resources/memories/rows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Research preference","content":"Prefer primary sources and quote exact URLs.","source":"user","importance":5}'

curl http://localhost:4000/resources/memories/rows \
  -H "Authorization: Bearer $TOKEN"
```

Add fields and indexes:

```bash
curl -X POST http://localhost:4000/resources/memories/fields \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"archived","type":"boolean","defaultValue":false,"indexed":true}'

curl -X POST http://localhost:4000/resources/memories/indexes \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"source"}'
```

Create a relationship field:

```bash
curl -X POST http://localhost:4000/resources/citations/relationships \
  -H "Authorization: Bearer $API_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field":"document_id","references":{"resource":"documents","field":"id","onDelete":"cascade"}}'
```

Filter listed rows:

```bash
curl 'http://localhost:4000/resources/memories/rows?where[source]=user'
curl 'http://localhost:4000/resources/memories/rows?where[title][contains]=research&orderBy=created_at&orderDirection=desc&limit=25&offset=0'
```

Supported filter operators are `eq`, `ne`, `contains`, `gt`, `gte`, `lt`, `lte`, and `isNull`. The shorthand `where[field]=value` is equivalent to `where[field][eq]=value`.

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
  name: "memories",
  ownedByUser: true,
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "text", required: true },
    { name: "source", type: "text", indexed: true },
    { name: "importance", type: "integer", defaultValue: 1, indexed: true }
  ]
});
await localbase.resources.rows("memories").insert({
  title: "Research preference",
  content: "Prefer primary sources and quote exact URLs.",
  source: "user",
  importance: 5
});
await localbase.resources.rows("memories").list({
  where: { importance: { gte: 3 }, title: { contains: "Research" } },
  limit: 25,
  orderBy: "created_at",
  orderDirection: "desc"
});
```

See `examples/ai-memory-app` for a minimal SDK flow that signs in, inserts a memory, lists memories, and writes a saved output.

## Known Limits

- Localbase is currently a local development runtime.
- It is not yet a hosted production backend.
- Auth is email/password only.
- There is no dashboard-first workflow yet; the primary loop is CLI plus MCP.

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
