# Backforge MCP With Codex

Use this when you want a Codex agent to create Backforge database resources through MCP.

## 1. Start Backforge

Run these from the Backforge repo root:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev:api
```

Keep the API running at `http://localhost:4000`.

## 2. Add The MCP Server To Codex

Configure Codex to start Backforge with the quiet MCP command:

```toml
[mcp_servers.backforge]
command = "pnpm"
args = ["--silent", "mcp"]
cwd = "/media/manan/27c2ac5b-0083-4cea-a027-e77fa8c01f85/Computer_Science/backforge"

[mcp_servers.backforge.env]
API_BASE_URL = "http://localhost:4000"
```

The important command is `pnpm --silent mcp`, not `pnpm dev:mcp`. The `--silent` flag suppresses package-manager output so stdout is reserved for MCP protocol messages.

## 3. Test From Codex

Ask Codex:

```text
Use the backforge MCP server. Call get_backend_summary, then create a products resource with name text required, price integer required, and in_stock boolean default true. After that, list resources.
```

Expected behavior:

- Codex calls `get_backend_summary`.
- Codex calls `create_resource`.
- Backforge creates a real Postgres table and metadata.
- Codex calls `list_resources` or `describe_resource` to verify it.

The agent should not write SQL manually for this flow.

## Available Resource Tools

- `get_backend_summary`
- `list_resources`
- `describe_resource`
- `create_resource`
- `list_rows`
- `insert_row`
- `describe_auth_config`
