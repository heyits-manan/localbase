# AI Memory App Example

This is a minimal proof that an app can read and write against the Localbase AI memory backend after Codex creates it through MCP.

## Prerequisites

From a generated Localbase project:

```bash
localbase start
localbase agent codex --install
```

Then ask Codex:

```text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
```

## Run

From the repository root:

```bash
export API_ADMIN_TOKEN="$(grep '^API_ADMIN_TOKEN=' /path/to/ai-memory/.env | cut -d= -f2-)"
pnpm --silent exec tsx examples/ai-memory-app/src/ai-memory-flow.ts
```

The script signs up or signs in a user, inserts one memory, lists memories, creates a saved output, and reads it back.
