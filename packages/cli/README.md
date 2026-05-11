# Localbase CLI

Localbase is a local-first backend runtime for AI coding agents. It starts a local Postgres-backed API and exposes an MCP server so Codex can create resources, fields, indexes, rows, and auth-owned data through structured tools.

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
localbase init [directory]
```

Scaffold a generated Localbase project with `docker-compose.yml`, `.env`, `localbase.config.json`, and a project README.

```bash
localbase start
```

Start the local Docker Compose runtime.

```bash
localbase stop
```

Stop the local Docker Compose runtime.

```bash
localbase status
```

Show Docker Compose service status.

```bash
localbase agent codex --install
```

Register the current Localbase project as Codex's `localbase` MCP server.

```bash
localbase mcp
```

Run the MCP stdio server for the current project. Codex uses this command after registration.

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

## Troubleshooting

If Docker says permission is denied:

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

If port `5432` is already allocated, stop the conflicting Postgres container or change the host port in `docker-compose.yml`.

If Codex cannot see the MCP server, run this from the generated project:

```bash
localbase agent codex --install
codex mcp get localbase
```

The registration should show:

```text
command: localbase
args: mcp --project /path/to/your/project
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
