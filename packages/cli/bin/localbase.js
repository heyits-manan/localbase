#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import net from "node:net";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const version = packageJson.version;

const help = `Localbase CLI

Usage:
  localbase init [directory] [--force] [--with-web] [--local-images] [--api-port <port>] [--web-port <port>] [--image-tag <tag>]
  localbase start
  localbase stop
  localbase status
  localbase mcp [--project <directory>]
  localbase agent codex [--install]
  localbase doctor

Commands:
  init          Scaffold a local-first Localbase project. Does not start services.
  start         Start the generated Docker Compose runtime.
  stop          Stop the generated Docker Compose runtime.
  status        Show Docker Compose service status.
  mcp           Run the MCP stdio server for the generated project.
  agent codex   Print or install Codex MCP setup for this Localbase project.
  doctor        Check Docker, API, images, and Codex MCP setup.
`;

function exitWith(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function parseOptions(args) {
  const positionals = [];
  const options = {
    force: false,
    withWeb: false,
    localImages: false,
    apiPort: "4000",
    webPort: "3000",
    imageTag: "latest"
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--with-web") {
      options.withWeb = true;
    } else if (arg === "--local-images") {
      options.localImages = true;
    } else if (arg === "--api-port") {
      options.apiPort = requireValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--api-port=")) {
      options.apiPort = arg.slice("--api-port=".length);
    } else if (arg === "--web-port") {
      options.webPort = requireValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--web-port=")) {
      options.webPort = arg.slice("--web-port=".length);
    } else if (arg === "--image-tag") {
      options.imageTag = requireValue(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--image-tag=")) {
      options.imageTag = arg.slice("--image-tag=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(help);
      process.exit(0);
    } else if (arg.startsWith("-")) {
      exitWith(`Unknown option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  validatePort(options.apiPort, "--api-port");
  validatePort(options.webPort, "--web-port");

  return { positionals, options };
}

function requireValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    exitWith(`Missing value for ${option}`);
  }
  return value;
}

function validatePort(value, option) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    exitWith(`${option} must be a TCP port between 1 and 65535.`);
  }
}

function initProject(args) {
  const { positionals, options } = parseOptions(args);
  const targetDir = resolve(process.cwd(), positionals[0] ?? "localbase");

  if (existsSync(targetDir)) {
    const entries = readdirSync(targetDir);
    if (entries.length > 0 && !options.force) {
      exitWith(`Target directory is not empty: ${targetDir}\nUse --force to write Localbase files into it.`);
    }
  } else {
    mkdirSync(targetDir, { recursive: true });
  }

  const files = {
    ".env": envTemplate(options),
    ".gitignore": gitignoreTemplate(),
    "docker-compose.yml": composeTemplate(options),
    "localbase.config.json": configTemplate(options),
    "README.md": readmeTemplate(options)
  };

  for (const [file, content] of Object.entries(files)) {
    const path = resolve(targetDir, file);
    if (existsSync(path) && !options.force) {
      exitWith(`Refusing to overwrite ${path}. Use --force to replace generated Localbase files.`);
    }
    writeFileSync(path, content);
  }

  const relativeTarget = positionals[0] ?? "localbase";
  console.log(`Created Localbase project in ${targetDir}`);
  console.log("Generated .env, .gitignore, docker-compose.yml, localbase.config.json, and README.md.");
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${relativeTarget}`);
  console.log("  localbase start");
  console.log("  localbase agent codex --install");
  console.log("");
  console.log("Then ask Codex:");
  console.log(
    "  Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources."
  );
}

function envTemplate(options) {
  const adminToken = randomBytes(24).toString("base64url");
  return `LOCALBASE_API_PORT=${options.apiPort}
LOCALBASE_API_URL=http://localhost:${options.apiPort}
LOCALBASE_WEB_PORT=${options.webPort}
LOCALBASE_IMAGE_TAG=${options.imageTag}
API_ADMIN_TOKEN=${adminToken}

POSTGRES_USER=localbase
POSTGRES_PASSWORD=localbase
POSTGRES_DB=localbase
LOCALBASE_POSTGRES_PORT=5432
DATABASE_URL=postgresql://localbase:localbase@postgres:5432/localbase
`;
}

function gitignoreTemplate() {
  return `.env.local
*.log
`;
}

function composeTemplate(options) {
  const apiImage = imageName("api", options);
  const mcpImage = imageName("mcp", options);
  const webImage = imageName("web", options);
  const webService = options.withWeb
    ? `
  web:
    image: ${webImage}
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "\${LOCALBASE_WEB_PORT:-${options.webPort}}:3000"
`
    : "";

  return `services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-localbase}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-localbase}
      POSTGRES_DB: \${POSTGRES_DB:-localbase}
    ports:
      - "\${LOCALBASE_POSTGRES_PORT:-5432}:5432"
    volumes:
      - localbase_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-localbase} -d \${POSTGRES_DB:-localbase}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    image: ${apiImage}
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: \${DATABASE_URL:-postgresql://localbase:localbase@postgres:5432/localbase}
      API_PORT: "4000"
      API_BASE_URL: http://localhost:\${LOCALBASE_API_PORT:-${options.apiPort}}
      API_ADMIN_TOKEN: \${API_ADMIN_TOKEN}
    ports:
      - "\${LOCALBASE_API_PORT:-${options.apiPort}}:4000"

  mcp:
    image: ${mcpImage}
    profiles:
      - agent
    depends_on:
      - api
    environment:
      API_BASE_URL: http://api:4000
      API_ADMIN_TOKEN: \${API_ADMIN_TOKEN}
${webService}
volumes:
  localbase_postgres_data:
`;
}

function imageName(service, options) {
  const tag = `\${LOCALBASE_IMAGE_TAG:-${options.imageTag}}`;
  if (options.localImages) {
    return `localbase-${service}:${tag}`;
  }
  return `mananchataut/localbase-${service}:${tag}`;
}

function configTemplate(options) {
  return `${JSON.stringify(
    {
      version: 1,
      apiUrl: `http://localhost:${options.apiPort}`,
      imageTag: options.imageTag,
      images: {
        local: options.localImages
      },
      services: {
        web: options.withWeb
      }
    },
    null,
    2
  )}
`;
}

function readmeTemplate(options) {
  const webLine = options.withWeb ? `\nWeb UI: http://localhost:${options.webPort}\n` : "";
  return `# Localbase Project

This directory was generated by \`localbase init\`.

## Start Localbase

\`\`\`bash
localbase start
\`\`\`

API: http://localhost:${options.apiPort}${webLine}

## Connect Codex

\`\`\`bash
localbase agent codex --install
\`\`\`

Then restart Codex from a shell where \`docker ps\` works.

Try this first prompt:

\`\`\`text
Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.
\`\`\`

## Stop Localbase

\`\`\`bash
localbase stop
\`\`\`
`;
}

function parseProjectOption(args) {
  let projectDir = process.cwd();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--project") {
      projectDir = resolve(process.cwd(), requireValue(args, index, arg));
      index += 1;
    } else if (arg.startsWith("--project=")) {
      projectDir = resolve(process.cwd(), arg.slice("--project=".length));
    } else if (arg === "--help" || arg === "-h") {
      console.log(help);
      process.exit(0);
    } else {
      exitWith(`Unknown option: ${arg}`);
    }
  }

  return projectDir;
}

function commandToString(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });
}

function printCommandOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function formatDockerFailure(output) {
  if (/permission denied.+docker\.sock|permission denied while trying to connect to the docker API/i.test(output)) {
    return [
      "Docker is not reachable from this shell.",
      "Fix:",
      "  sudo usermod -aG docker $USER",
      "  newgrp docker",
      "Then verify:",
      "  docker ps"
    ].join("\n");
  }

  const portMatch = output.match(/Bind for 0\.0\.0\.0:(\d+) failed: port is already allocated/i);
  if (portMatch) {
    const port = portMatch[1];
    return [
      `Port ${port} is already in use.`,
      "Find the conflicting container:",
      `  docker ps --filter publish=${port}`,
      "Stop it, or edit docker-compose.yml to use a different host port."
    ].join("\n");
  }

  const imageMatch = output.match(/(?:not found|failed to resolve reference).*?(mananchataut\/localbase-[^:\s]+):([^\s"]+)/i);
  if (imageMatch) {
    return [
      `Docker image ${imageMatch[1]}:${imageMatch[2]} was not found.`,
      "Use the default runtime tag:",
      "  LOCALBASE_IMAGE_TAG=latest localbase start",
      "or publish that Docker tag before starting the project."
    ].join("\n");
  }

  if (/no matching manifest.+linux\/arm64|no match for platform in manifest/i.test(output)) {
    return [
      "This Localbase release is missing a Docker image for your CPU architecture.",
      "Please upgrade after the maintainer publishes corrected multi-platform runtime images."
    ].join("\n");
  }

  if (/error from registry: denied|pull access denied|insufficient_scope/i.test(output)) {
    return [
      "Docker could not pull one of the Localbase images.",
      "Check that docker-compose.yml uses the published Docker Hub images:",
      "  mananchataut/localbase-api",
      "  mananchataut/localbase-mcp"
    ].join("\n");
  }

  return null;
}

function runCompose(args, options = {}) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });

  if (result.error) {
    exitWith(`Failed to run Docker Compose. Make sure Docker Desktop is installed and running.\n${result.error.message}`);
  }

  printCommandOutput(result);

  if ((result.status ?? 1) !== 0) {
    const hint = formatDockerFailure(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    if (hint) {
      exitWith(`\n${hint}`, result.status ?? 1);
    }
  }

  if ((result.status ?? 1) === 0 && options.successMessage) {
    console.log(options.successMessage);
  }

  process.exit(result.status ?? 1);
}

async function preparePostgresHostPort(projectDir) {
  upgradeComposePostgresPort(projectDir);

  if (isComposeServiceRunning(projectDir, "postgres")) {
    return;
  }

  const env = readEnvFile(projectDir);
  const configuredPort = Number(env.LOCALBASE_POSTGRES_PORT ?? "5432");
  const currentPort = Number.isInteger(configuredPort) && configuredPort >= 1 && configuredPort <= 65535 ? configuredPort : 5432;
  const availablePort = await findAvailablePort(currentPort);

  if (availablePort !== currentPort || env.LOCALBASE_POSTGRES_PORT === undefined) {
    upsertEnvValue(projectDir, "LOCALBASE_POSTGRES_PORT", String(availablePort));
  }

  if (availablePort !== currentPort) {
    console.log(`Port ${currentPort} is already in use. Using Postgres host port ${availablePort} for this project.`);
  }
}

function upgradeComposePostgresPort(projectDir) {
  const composePath = resolve(projectDir, "docker-compose.yml");
  const compose = readFileSync(composePath, "utf8");
  const upgraded = compose.replace('      - "5432:5432"', '      - "${LOCALBASE_POSTGRES_PORT:-5432}:5432"');
  if (upgraded !== compose) {
    writeFileSync(composePath, upgraded);
  }
}

function isComposeServiceRunning(projectDir, service) {
  const result = spawnSync("docker", ["compose", "ps", "--status", "running", "--services", service], {
    cwd: projectDir,
    encoding: "utf8",
    stdio: "pipe"
  });

  return result.status === 0 && result.stdout.split("\n").some((line) => line.trim() === service);
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port <= 65535 && port < startPort + 100; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  exitWith(`Could not find an available Postgres host port starting at ${startPort}.`);
}

function isPortAvailable(port) {
  return new Promise((resolvePort) => {
    const server = net.createServer();
    server.once("error", () => resolvePort(false));
    server.once("listening", () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

function upsertEnvValue(projectDir, key, value) {
  const envPath = resolve(projectDir, ".env");
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = existing.split("\n");
  const keyPrefix = `${key}=`;
  let found = false;

  const nextLines = lines.map((line) => {
    if (line.startsWith(keyPrefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] === "") {
      nextLines.splice(nextLines.length - 1, 0, `${key}=${value}`);
    } else {
      nextLines.push(`${key}=${value}`);
    }
  }

  writeFileSync(envPath, nextLines.join("\n"));
}

async function startProject() {
  ensureProject();
  const config = readConfig();
  const apiUrl = config.apiUrl ?? "http://localhost:4000";
  await preparePostgresHostPort(process.cwd());
  console.log("Starting Localbase with Docker Compose...");
  runCompose(["up", "-d"], {
    successMessage: [
      "Localbase runtime started.",
      `API: ${apiUrl}`,
      "Next: localbase agent codex --install"
    ].join("\n")
  });
}

function stopProject() {
  ensureProject();
  runCompose(["down"]);
}

function statusProject() {
  ensureProject();
  runCompose(["ps"]);
}

function runMcp(args) {
  const projectDir = parseProjectOption(args);
  ensureProject(projectDir);
  runMcpServer(projectDir).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown MCP startup error.";
    console.error(message);
    process.exit(1);
  });
}

function codexAddArgs(projectDir, apiUrl, adminToken) {
  return [
    "mcp",
    "add",
    "localbase",
    "--env",
    `API_BASE_URL=${apiUrl}`,
    ...(adminToken ? ["--env", `API_ADMIN_TOKEN=${adminToken}`] : []),
    "--",
    "localbase",
    "mcp",
    "--project",
    projectDir
  ];
}

function printCodexConfig(args = []) {
  const projectDir = process.cwd();
  ensureProject(projectDir);
  const config = readConfig(projectDir);
  const apiUrl = config.apiUrl ?? "http://localhost:4000";
  const adminToken = readEnvFile(projectDir).API_ADMIN_TOKEN;
  const install = args.includes("--install");
  const projectArg = shellQuote(projectDir);

  if (install) {
    installCodexMcp(projectDir, apiUrl, adminToken);
    return;
  }

  console.log("Codex CLI command:");
  console.log("");
  console.log(
    `codex mcp add localbase --env API_BASE_URL=${apiUrl}${
      adminToken ? ` --env API_ADMIN_TOKEN=${shellQuote(adminToken)}` : ""
    } -- localbase mcp --project ${projectArg}`
  );
  console.log("");
  console.log("Manual config:");
  console.log("");
  console.log("[mcp_servers.localbase]");
  console.log('command = "localbase"');
  console.log(`args = ["mcp", "--project", ${JSON.stringify(projectDir)}]`);
  console.log("");
  console.log("[mcp_servers.localbase.env]");
  console.log(`API_BASE_URL = "${apiUrl}"`);
  if (adminToken) {
    console.log(`API_ADMIN_TOKEN = "${adminToken}"`);
  }
}

function installCodexMcp(projectDir, apiUrl, adminToken) {
  const remove = runCommand("codex", ["mcp", "remove", "localbase"]);
  if (remove.error && remove.error.code === "ENOENT") {
    exitWith(
      [
        "Codex CLI was not found.",
        "Install Codex or open a shell where the `codex` command is on PATH, then run:",
        "  localbase agent codex --install"
      ].join("\n")
    );
  }

  const addArgs = codexAddArgs(projectDir, apiUrl, adminToken);
  const add = runCommand("codex", addArgs);
  printCommandOutput(add);

  if (add.error) {
    exitWith(`Failed to run ${commandToString("codex", addArgs)}\n${add.error.message}`);
  }
  if ((add.status ?? 1) !== 0) {
    exitWith(`Failed to install Codex MCP server. Run this command manually:\n${commandToString("codex", addArgs)}`);
  }

  console.log("");
  console.log("Installed Codex MCP server for this Localbase project.");
  console.log("Restart Codex from a shell where `docker ps` works.");
  console.log("");
  console.log("Next prompt:");
  console.log(
    "Use the Localbase MCP server. Call get_backend_summary, then create an AI memory backend with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources."
  );
}

function doctorProject() {
  ensureProject();
  const config = readConfig();
  const apiUrl = config.apiUrl ?? "http://localhost:4000";
  let failures = 0;

  failures += check("Docker socket", () => {
    const result = runCommand("docker", ["ps"]);
    return result.status === 0 ? ok() : fail(formatDockerFailure(`${result.stdout}\n${result.stderr}`) ?? "Docker is not reachable.");
  });

  failures += check("Docker Compose", () => {
    const result = runCommand("docker", ["compose", "version"]);
    return result.status === 0 ? ok(firstLine(result.stdout)) : fail(firstLine(result.stderr) || "docker compose failed.");
  });

  failures += check("Compose services", () => {
    const result = runCommand("docker", ["compose", "ps"], { cwd: process.cwd() });
    return result.status === 0 ? ok(firstNonEmptyLine(result.stdout) || "docker compose ps succeeded.") : fail(firstLine(result.stderr) || "docker compose ps failed.");
  });

  failures += check("API health", () => checkApi(apiUrl));

  failures += check("Docker images", () => {
    const env = readEnvFile();
    const tag = env.LOCALBASE_IMAGE_TAG ?? config.imageTag ?? "latest";
    const images = [`mananchataut/localbase-api:${tag}`, `mananchataut/localbase-mcp:${tag}`];
    for (const image of images) {
      const inspect = runCommand("docker", ["image", "inspect", image]);
      if (inspect.status === 0) {
        continue;
      }
      const pull = runCommand("docker", ["pull", image]);
      if (pull.status !== 0) {
        return fail(formatDockerFailure(`${pull.stdout}\n${pull.stderr}`) ?? `Cannot pull ${image}`);
      }
    }
    return ok(images.join(", "));
  });

  failures += check("Codex MCP registration", () => {
    const result = runCommand("codex", ["mcp", "get", "localbase"]);
    if (result.error?.code === "ENOENT") {
      return fail("Codex CLI was not found.");
    }
    if (result.status !== 0) {
      return fail("localbase is not registered. Run: localbase agent codex --install");
    }
    const output = `${result.stdout}\n${result.stderr}`;
    if (!output.includes("command: localbase") || !output.includes(`--project ${process.cwd()}`)) {
      return fail(`Codex MCP is not pointed at this project. Run: localbase agent codex --install`);
    }
    return ok("localbase MCP points at this project.");
  });

  if (failures > 0) {
    console.log("");
    console.log("Fix the failed checks above, then rerun: localbase doctor");
    exitWith(`\nDoctor found ${failures} issue${failures === 1 ? "" : "s"}.`, 1);
  }

  console.log("\nDoctor found no issues.");
}

function check(label, fn) {
  const result = fn();
  const icon = result.pass ? "ok" : "fail";
  console.log(`[${icon}] ${label}${result.message ? `: ${result.message}` : ""}`);
  return result.pass ? 0 : 1;
}

function ok(message = "") {
  return { pass: true, message };
}

function fail(message = "") {
  return { pass: false, message };
}

function firstLine(value = "") {
  return value.trim().split("\n")[0] ?? "";
}

function firstNonEmptyLine(value = "") {
  return value.split("\n").find((line) => line.trim())?.trim() ?? "";
}

function checkApi(apiUrl) {
  const result = runCommand("node", ["-e", `fetch(${JSON.stringify(`${apiUrl}/health`)}).then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`]);
  return result.status === 0 ? ok(apiUrl) : fail(`API is not reachable at ${apiUrl}. Run: localbase start`);
}

function readEnvFile(projectDir = process.cwd()) {
  const path = resolve(projectDir, ".env");
  if (!existsSync(path)) {
    return {};
  }
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

async function runMcpServer(projectDir) {
  const config = readConfig(projectDir);
  const apiBaseUrl = process.env.API_BASE_URL ?? config.apiUrl ?? "http://localhost:4000";
  const adminToken = process.env.API_ADMIN_TOKEN ?? readEnvFile(projectDir).API_ADMIN_TOKEN;
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { z } = await import("zod");

  const server = new McpServer({
    name: "localbase-mcp",
    version
  });

  registerMcpTools(server, apiBaseUrl, z, adminToken);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function registerMcpTools(server, apiBaseUrl, z, adminToken) {
  const fieldTypeSchema = z.enum(["text", "integer", "boolean", "timestamp", "uuid", "jsonb"]);
  const defaultValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
  const resourceFieldInputSchema = z.object({
    name: z.string().min(1),
    type: fieldTypeSchema,
    required: z.boolean().optional(),
    unique: z.boolean().optional(),
    defaultValue: defaultValueSchema.optional(),
    indexed: z.boolean().optional(),
    references: z
      .object({
        resource: z.string().min(1),
        field: z.string().min(1).default("id"),
        onDelete: z.enum(["restrict", "cascade", "set null"]).optional()
      })
      .optional()
  });
  const createResourceRelationshipInputSchema = z.object({
    field: z.string().min(1),
    references: z.object({
      resource: z.string().min(1),
      field: z.string().min(1).default("id"),
      onDelete: z.enum(["restrict", "cascade", "set null"]).default("restrict")
    }),
    required: z.boolean().optional(),
    unique: z.boolean().optional()
  });
  const updateResourceFieldInputSchema = z.object({
    name: z.string().min(1).optional(),
    required: z.boolean().optional(),
    defaultValue: defaultValueSchema.optional(),
    indexed: z.boolean().optional()
  });
  const filterValueSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({
      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
      ne: z.union([z.string(), z.number(), z.boolean()]).optional(),
      contains: z.union([z.string(), z.number(), z.boolean()]).optional(),
      gt: z.union([z.string(), z.number(), z.boolean()]).optional(),
      gte: z.union([z.string(), z.number(), z.boolean()]).optional(),
      lt: z.union([z.string(), z.number(), z.boolean()]).optional(),
      lte: z.union([z.string(), z.number(), z.boolean()]).optional(),
      isNull: z.boolean().optional()
    })
  ]);

  const request = async (path, authToken, init) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  };

  const buildRowListQuery = (input) => {
    const params = new URLSearchParams();
    for (const [field, value] of Object.entries(input.where ?? {})) {
      if (typeof value === "object" && value !== null) {
        for (const [operator, operatorValue] of Object.entries(value)) {
          if (operatorValue !== undefined) {
            params.set(`where[${field}][${operator}]`, String(operatorValue));
          }
        }
      } else {
        params.set(`where[${field}]`, String(value));
      }
    }
    if (input.limit !== undefined) params.set("limit", String(input.limit));
    if (input.offset !== undefined) params.set("offset", String(input.offset));
    if (input.orderBy !== undefined) params.set("orderBy", input.orderBy);
    if (input.orderDirection !== undefined) params.set("orderDirection", input.orderDirection);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  server.registerTool("get_backend_summary", { description: "Summarize the local Localbase backend, API health, auth config, and known resources.", inputSchema: {} }, async () => {
    const [health, resources] = await Promise.all([request("/health"), request("/resources")]);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              apiBaseUrl,
              health: JSON.parse(health.content[0].text),
              auth: {
                enabled: true,
                providers: ["email_password"],
                ownedResources: {
                  enabled: true,
                  ownershipField: "user_id",
                  createWith: { ownedByUser: true }
                }
              },
              resources: JSON.parse(resources.content[0].text)
            },
            null,
            2
          )
        }
      ]
    };
  });

  server.registerTool("list_resources", { description: "List known Localbase resources.", inputSchema: {} }, async () => request("/resources"));
  server.registerTool("describe_resource", { description: "Describe a known Localbase resource.", inputSchema: { name: z.string().min(1) } }, async ({ name }) => request(`/resources/${encodeURIComponent(name)}`));
  server.registerTool(
    "create_resource",
    {
      description: "Create a Localbase resource with fields, defaults, uniqueness, and basic indexes.",
      inputSchema: {
        name: z.string().min(1),
        ownedByUser: z.boolean().optional(),
        fields: z.array(resourceFieldInputSchema).default([])
      }
    },
    async (input) => request("/resources", adminToken, { method: "POST", body: JSON.stringify(input) })
  );
  server.registerTool("delete_resource", { description: "Delete a Localbase resource, including its rows and metadata.", inputSchema: { name: z.string().min(1) } }, async ({ name }) => request(`/resources/${encodeURIComponent(name)}`, adminToken, { method: "DELETE" }));
  server.registerTool("add_field", { description: "Add a field to an existing Localbase resource.", inputSchema: { resource: z.string().min(1), ...resourceFieldInputSchema.shape } }, async ({ resource, ...field }) => request(`/resources/${encodeURIComponent(resource)}/fields`, adminToken, { method: "POST", body: JSON.stringify(field) }));
  server.registerTool("update_field", { description: "Rename a field or update its required/default/index metadata.", inputSchema: { resource: z.string().min(1), field: z.string().min(1), ...updateResourceFieldInputSchema.shape } }, async ({ resource, field, ...input }) => request(`/resources/${encodeURIComponent(resource)}/fields/${encodeURIComponent(field)}`, adminToken, { method: "PATCH", body: JSON.stringify(input) }));
  server.registerTool("delete_field", { description: "Delete a field from a Localbase resource.", inputSchema: { resource: z.string().min(1), field: z.string().min(1) } }, async ({ resource, field }) => request(`/resources/${encodeURIComponent(resource)}/fields/${encodeURIComponent(field)}`, adminToken, { method: "DELETE" }));
  server.registerTool("add_index", { description: "Add an index to an existing Localbase resource field.", inputSchema: { resource: z.string().min(1), field: z.string().min(1) } }, async ({ resource, field }) => request(`/resources/${encodeURIComponent(resource)}/indexes`, adminToken, { method: "POST", body: JSON.stringify({ field }) }));
  server.registerTool("create_relationship", { description: "Create a uuid relationship field that references another Localbase resource.", inputSchema: { resource: z.string().min(1), ...createResourceRelationshipInputSchema.shape } }, async ({ resource, ...input }) => request(`/resources/${encodeURIComponent(resource)}/relationships`, adminToken, { method: "POST", body: JSON.stringify(input) }));
  server.registerTool(
    "list_rows",
    {
      description: "List rows for a Localbase resource.",
      inputSchema: {
        resource: z.string().min(1),
        authToken: z.string().optional(),
        where: z.record(filterValueSchema).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.string().optional(),
        orderDirection: z.enum(["asc", "desc"]).optional()
      }
    },
    async ({ resource, authToken, where, limit, offset, orderBy, orderDirection }) =>
      request(`/resources/${encodeURIComponent(resource)}/rows${buildRowListQuery({ where, limit, offset, orderBy, orderDirection })}`, authToken)
  );
  server.registerTool("insert_row", { description: "Insert a row into a Localbase resource.", inputSchema: { resource: z.string().min(1), authToken: z.string().optional(), data: z.record(z.unknown()) } }, async ({ resource, authToken, data }) => request(`/resources/${encodeURIComponent(resource)}/rows`, authToken, { method: "POST", body: JSON.stringify(data) }));
  server.registerTool("get_row", { description: "Get one row from a Localbase resource by id.", inputSchema: { resource: z.string().min(1), id: z.string().min(1), authToken: z.string().optional() } }, async ({ resource, id, authToken }) => request(`/resources/${encodeURIComponent(resource)}/rows/${encodeURIComponent(id)}`, authToken));
  server.registerTool("update_row", { description: "Update one row in a Localbase resource by id.", inputSchema: { resource: z.string().min(1), id: z.string().min(1), authToken: z.string().optional(), data: z.record(z.unknown()) } }, async ({ resource, id, authToken, data }) => request(`/resources/${encodeURIComponent(resource)}/rows/${encodeURIComponent(id)}`, authToken, { method: "PATCH", body: JSON.stringify(data) }));
  server.registerTool("delete_row", { description: "Delete one row from a Localbase resource by id.", inputSchema: { resource: z.string().min(1), id: z.string().min(1), authToken: z.string().optional() } }, async ({ resource, id, authToken }) => request(`/resources/${encodeURIComponent(resource)}/rows/${encodeURIComponent(id)}`, authToken, { method: "DELETE" }));
  server.registerTool("describe_auth_config", { description: "Describe the local Localbase authentication configuration.", inputSchema: {} }, async () => ({
    content: [{ type: "text", text: JSON.stringify({ enabled: true, providers: ["email_password"], session: { type: "bearer_token", durationDays: 30 }, endpoints: { signUp: "POST /auth/signup", login: "POST /auth/login", logout: "POST /auth/logout", currentUser: "GET /auth/me" }, ownedResources: { enabled: true, createWith: { ownedByUser: true }, ownershipField: "user_id" } }, null, 2) }]
  }));
  server.registerTool("sign_up", { description: "Create a Localbase email/password user and return a bearer token.", inputSchema: { email: z.string().email(), password: z.string().min(8) } }, async (input) => request("/auth/signup", undefined, { method: "POST", body: JSON.stringify(input) }));
  server.registerTool("sign_in", { description: "Sign in a Localbase email/password user and return a bearer token.", inputSchema: { email: z.string().email(), password: z.string().min(8) } }, async (input) => request("/auth/login", undefined, { method: "POST", body: JSON.stringify(input) }));
  server.registerTool("get_current_user", { description: "Return the Localbase user for a bearer token.", inputSchema: { authToken: z.string().min(1) } }, async ({ authToken }) => request("/auth/me", authToken));
  server.registerTool("sign_out", { description: "Sign out a Localbase bearer token.", inputSchema: { authToken: z.string().min(1) } }, async ({ authToken }) => request("/auth/logout", authToken, { method: "POST" }));
}

function ensureProject(projectDir = process.cwd()) {
  if (!existsSync(resolve(projectDir, "docker-compose.yml")) || !existsSync(resolve(projectDir, "localbase.config.json"))) {
    exitWith("This command must be run from a Localbase project directory. Create one with: localbase init");
  }
}

function readConfig(projectDir = process.cwd()) {
  try {
    return JSON.parse(readFileSync(resolve(projectDir, "localbase.config.json"), "utf8"));
  } catch (error) {
    exitWith(`Unable to read localbase.config.json: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    console.log(help);
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(version);
    return;
  }

  if (command === "init") {
    initProject([subcommand, ...rest].filter(Boolean));
  } else if (command === "start") {
    await startProject();
  } else if (command === "stop") {
    stopProject();
  } else if (command === "status") {
    statusProject();
  } else if (command === "mcp") {
    runMcp([subcommand, ...rest].filter(Boolean));
  } else if (command === "agent" && subcommand === "codex") {
    printCodexConfig(rest);
  } else if (command === "doctor") {
    doctorProject();
  } else {
    exitWith(`Unknown command.\n\n${help}`);
  }
}

main().catch((error) => {
  exitWith(error instanceof Error ? error.message : "Unknown Localbase CLI error.");
});
