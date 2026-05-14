# Localbase CLI

Localbase is a local-first backend runtime for AI coding agents. It starts a local Postgres-backed API and exposes an MCP server so Codex can create resources, fields, indexes, relationships, rows, and auth-owned data through structured tools.

## Install

```bash
npm install -g @mrace07/localbase
```

Verify the install:

```bash
localbase --version
localbase --help
```

Requires Node.js 20+ and Docker.

## Quick Start

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

## One-Off Init

You can create a project without installing globally first:

```bash
npx @mrace07/localbase init my-backend
cd my-backend
npm install -g @mrace07/localbase
localbase start
```

## Commands

```bash
localbase init [directory] [--force] [--with-web] [--local-images] [--api-port <port>] [--web-port <port>] [--image-tag <tag>]
```

Scaffold a generated Localbase project with `.env`, `.gitignore`, `docker-compose.yml`, `localbase.config.json`, and a project README. `init` does not start services.

- `--force`: write Localbase files into an existing non-empty directory and replace generated files.
- `--with-web`: include the optional web service in the generated Compose file.
- `--local-images`: use local image names instead of Docker Hub images.
- `--api-port <port>`: set the host API port. Default: `4000`.
- `--web-port <port>`: set the host web port. Default: `3000`.
- `--image-tag <tag>`: set the Localbase runtime image tag. Default: `latest`.

```bash
localbase start
```

Start the local Docker Compose runtime. If the generated Postgres host port is already in use, Localbase selects the next available port and writes it to `.env` as `LOCALBASE_POSTGRES_PORT`.

```bash
localbase stop
```

Stop the local Docker Compose runtime.

```bash
localbase status
```

Show Docker Compose service status.

```bash
localbase mcp [--project <directory>]
```

Run the MCP stdio server for a generated project. Codex uses this command after registration. `--project` lets Codex point at the generated project even when it starts from another working directory.

```bash
localbase agent codex [--install]
```

Print the Codex MCP setup for the current project. With `--install`, register the project as Codex's `localbase` MCP server.

```bash
localbase doctor
```

Check Docker access, Docker Compose, API health, Docker image availability, and Codex MCP registration.

## Runtime

Generated projects use Docker images published on Docker Hub:

- `mananchataut/localbase-api:latest`
- `mananchataut/localbase-mcp:latest`

Those image tags are published as multi-platform Linux images, so Docker Desktop and Docker Engine pull the right variant automatically on macOS, Windows, and Linux.

The API runs at:

```text
http://localhost:4000
```

Generated projects include an `API_ADMIN_TOKEN` in `.env`. The CLI passes that token to Codex MCP registration, and schema-changing API routes require `Authorization: Bearer <API_ADMIN_TOKEN>` when the token is set.

## Codex MCP

Run this from the generated project:

```bash
localbase agent codex --install
codex mcp get localbase
```

The registration should show:

```text
command: localbase
args: mcp --project /path/to/your/project
```

Available MCP tools include `get_backend_summary`, `list_resources`, `describe_resource`, `create_resource`, `delete_resource`, `add_field`, `update_field`, `delete_field`, `add_index`, `create_relationship`, row CRUD tools, and email/password auth tools.

## Troubleshooting

If Docker says permission is denied:

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

If port `5432` is already allocated, `localbase start` automatically selects another Postgres host port and stores it in `.env`.

If Codex cannot see the MCP server, rerun the install command from the generated project and restart Codex from a shell where Docker works:

```bash
localbase agent codex --install
codex mcp get localbase
```

## Package

npm package:

```text
@mrace07/localbase
```

CLI binary:

```text
localbase
```
