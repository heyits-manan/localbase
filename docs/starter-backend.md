# AI Memory Backend Smoke Test

This walkthrough verifies the Localbase MVP loop after Codex MCP is connected.

## Resources Created

The flagship schema contains:

- `memories`: auth-owned rows with `title`, `content`, `source`, `importance`, and `created_at`.
- `documents`: auth-owned rows with `title`, `url`, `body`, and `status`.
- `conversations`: auth-owned rows with `title` and `summary`.
- `citations`: relationship to `documents` with `quote` and `note`.
- `outputs`: auth-owned rows with `title`, `kind`, and `content`.

Create them through MCP from Codex:

```text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
```

## Auth-Owned Data

Use this prompt to verify per-user data:

```text
Use the Localbase MCP server. Sign up a test user, insert a memories row with title "Research preference", content "Prefer primary sources", source "user", and importance 5 using that auth token, then list rows for memories using the same token.
```

Expected behavior:

- `memories`, `documents`, `conversations`, and `outputs` have `ownedByUser: true`.
- The API automatically writes `user_id`.
- Listing rows with the user's token returns that user's rows.
- Client input should not provide `user_id`.

## SDK Smoke Check

App code can use the SDK after MCP creates the schema:

```ts
import { createLocalbaseClient } from "@localbase/sdk";

const localbase = createLocalbaseClient({
  baseUrl: "http://localhost:4000",
  adminToken: process.env.API_ADMIN_TOKEN
});

await localbase.auth.signUp("ada@example.com", "password123");

await localbase.resources.rows("memories").insert({
  title: "Research preference",
  content: "Prefer primary sources and quote exact URLs.",
  source: "user",
  importance: 5
});

const memories = await localbase.resources.rows("memories").list({
  where: { importance: { gte: 3 } },
  orderBy: "created_at",
  orderDirection: "desc",
  limit: 10
});

await localbase.resources.rows("outputs").insert({
  title: "Source policy",
  kind: "note",
  content: "Use primary sources for product claims."
});

console.log(memories);
```

See `examples/ai-memory-app` for a fuller minimal example.
