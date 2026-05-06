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

Run this as one shell command. The `--silent mcp` arguments must stay on the same command line as `codex mcp add`.

```bash
codex mcp remove localbase
codex mcp add localbase --env API_BASE_URL=http://localhost:4000 -- pnpm --dir /media/manan/27c2ac5b-0083-4cea-a027-e77fa8c01f85/Computer_Science/localbase --silent mcp
codex mcp get localbase
```

The final check should show `pnpm` with these arguments:

```text
--dir /media/manan/27c2ac5b-0083-4cea-a027-e77fa8c01f85/Computer_Science/localbase --silent mcp
```

If Codex prints `MCP client for localbase failed to start`, fix this command before testing prompts.

## 3. Test From Codex

Ask Codex:

```text
Use the localbase MCP server. Call get_backend_summary, then create a products resource with name text required, price integer required, and in_stock boolean default true. After that, list resources.
```

Expected behavior:

- Codex calls `get_backend_summary`.
- Codex calls `create_resource`.
- Localbase creates a real Postgres-backed resource and metadata.
- Codex calls `list_resources` or `describe_resource` to verify it.

The agent should not write SQL manually for this flow.

For a broader smoke test after `products` exists, ask Codex:

```text
Use the localbase MCP server. Create customers, categories, and orders resources for a small store backend. Then create an auth-owned saved_items resource, sign up a test user, insert one saved item with that auth token, and list resources.
```

Expected resources after the smoke test:

- `products`
- `customers`
- `categories`
- `orders`
- `saved_items`

## Available Resource Tools

- `get_backend_summary`
- `list_resources`
- `describe_resource`
- `create_resource`
- `delete_resource`
- `add_field`
- `update_field`
- `delete_field`
- `add_index`
- `list_rows`
- `insert_row`
- `get_row`
- `update_row`
- `delete_row`
- `describe_auth_config`
- `sign_up`
- `sign_in`
- `get_current_user`
- `sign_out`
