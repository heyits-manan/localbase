# Localbase MCP With Codex

Use this when you want a Codex agent to create Localbase database resources through MCP.

## 1. Start Localbase

Run these from the Localbase repo root:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev:api
```

Keep the API running at `http://localhost:4000`.

## 2. Add The MCP Server To Codex

Configure Codex to start Localbase with the quiet MCP command:

```toml
[mcp_servers.localbase]
command = "pnpm"
args = ["--silent", "mcp"]
cwd = "/absolute/path/to/localbase"

[mcp_servers.localbase.env]
API_BASE_URL = "http://localhost:4000"
```

The important command is `pnpm --silent mcp`, not `pnpm dev:mcp`. The `--silent` flag suppresses package-manager output so stdout is reserved for MCP protocol messages.

## 3. Test From Codex

Ask Codex:

```text
Use the localbase MCP server. Call get_backend_summary, then create a products resource with name text required, price integer required, and in_stock boolean default true. After that, list resources.
```

Expected behavior:

- Codex calls `get_backend_summary`.
- Codex calls `create_resource`.
- Localbase creates a real Postgres table and metadata.
- Codex calls `list_resources` or `describe_resource` to verify it.

The agent should not write SQL manually for this flow.

## Available Resource Tools

- `get_backend_summary`
- `list_resources`
- `describe_resource`
- `create_resource`
- `list_rows`
- `insert_row`
- `get_row`
- `update_row`
- `delete_row`
- `describe_auth_config`
