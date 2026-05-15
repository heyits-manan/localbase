# Localbase MCP With Codex

Use this when you want Codex to create and operate a local Postgres-backed app backend through Localbase MCP tools.

## 1. Create And Start A Project

```bash
npm install -g @mrace07/localbase
localbase init ai-memory
cd ai-memory
localbase start
```

Generated projects keep the stable defaults:

- API port: `4000`
- Postgres image: `postgres:16`
- API image: `mananchataut/localbase-api:latest`
- MCP image: `mananchataut/localbase-mcp:latest`

## 2. Add The MCP Server To Codex

Run this from the generated project directory:

```bash
localbase agent codex --install
codex mcp get localbase
```

The final check should point at the generated project:

```text
command: localbase
args: mcp --project /path/to/ai-memory
```

If Codex prints `MCP client for localbase failed to start`, rerun `localbase doctor` inside the generated project and fix the failed checks before testing prompts.

## 3. Flagship Prompt

Ask Codex:

```text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
```

Expected behavior:

- Codex calls `get_backend_summary`.
- Codex creates resources through MCP, not by writing SQL manually.
- Auth-owned resources use `ownedByUser: true`.
- Codex signs up a test user before inserting auth-owned sample rows.
- Codex calls `list_resources` or `describe_resource` to verify the schema.

## Demo Schema

- `users`: created through email/password auth.
- `memories`: auth-owned rows with `title`, `content`, `source`, `importance`, and `created_at`.
- `documents`: auth-owned rows with `title`, `url`, `body`, and `status`.
- `conversations`: auth-owned rows with `title` and `summary`.
- `citations`: relationship to `documents` with `quote` and `note`.
- `outputs`: auth-owned rows with `title`, `kind`, and `content`.

Useful indexes include `memories.importance`, `memories.source`, `documents.status`, `conversations.title`, and `outputs.kind`.

## Available Tools

- `get_backend_summary`
- `list_resources`
- `describe_resource`
- `create_resource`
- `delete_resource`
- `add_field`
- `update_field`
- `delete_field`
- `add_index`
- `create_relationship`
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
