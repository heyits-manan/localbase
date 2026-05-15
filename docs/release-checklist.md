# Clean-Machine Release Checklist

Run this before publishing the CLI package.

## Repository Checks

```bash
pnpm install
pnpm test
pnpm typecheck
```

If API tests need Postgres, start it first:

```bash
docker compose up -d postgres
pnpm db:migrate
```

## Docker Image Verification

Publish and verify the runtime images before npm publish:

```bash
docker login
pnpm docker:publish
docker buildx imagetools inspect mananchataut/localbase-api:latest
docker buildx imagetools inspect mananchataut/localbase-mcp:latest
```

Confirm both images include `linux/amd64` and `linux/arm64`.

## Packed CLI Install

Use a clean temporary directory:

```bash
cd packages/cli
npm pack
PACKED_TARBALL="$(pwd)/$(ls -t mrace07-localbase-*.tgz | head -n 1)"
TMPDIR="$(mktemp -d)"
cd "$TMPDIR"
npm install -g "$PACKED_TARBALL"
localbase --version
```

## Fresh Project Smoke Test

```bash
localbase init ai-memory
cd ai-memory
localbase start
localbase doctor
localbase agent codex --install
codex mcp get localbase
```

Then restart Codex and run:

```text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
```

Pass criteria:

- `localbase doctor` reports no issues.
- Codex can call `get_backend_summary`.
- The flagship prompt creates and lists the expected resources.
- A small app or SDK script can sign in, insert a memory, list memories, and create a saved output.
