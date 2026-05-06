#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
  localbase agent codex

Commands:
  init          Scaffold a local-first Localbase project. Does not start services.
  start         Start the generated Docker Compose runtime.
  stop          Stop the generated Docker Compose runtime.
  status        Show Docker Compose service status.
  mcp           Run the MCP stdio server through the generated Docker Compose service.
  agent codex   Print Codex MCP setup for this Localbase project.
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
    imageTag: version
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
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${relativeTarget}`);
  console.log("  npx @mrace07/localbase start");
  console.log("  npx @mrace07/localbase agent codex");
}

function envTemplate(options) {
  return `LOCALBASE_API_PORT=${options.apiPort}
LOCALBASE_API_URL=http://localhost:${options.apiPort}
LOCALBASE_WEB_PORT=${options.webPort}
LOCALBASE_IMAGE_TAG=${options.imageTag}

POSTGRES_USER=localbase
POSTGRES_PASSWORD=localbase
POSTGRES_DB=localbase
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
      - "5432:5432"
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
  return `ghcr.io/heyits-manan/localbase-${service}:${tag}`;
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

This directory was generated by \`npx @mrace07/localbase init\`.

## Start Localbase

\`\`\`bash
npx @mrace07/localbase start
\`\`\`

API: http://localhost:${options.apiPort}${webLine}

## Connect Codex

\`\`\`bash
npx @mrace07/localbase agent codex
\`\`\`

Then use the printed MCP command or config in Codex.

## Stop Localbase

\`\`\`bash
npx @mrace07/localbase stop
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

function runCompose(args, options = {}) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...options.env },
    stdio: options.stdio ?? "inherit"
  });

  if (result.error) {
    exitWith(`Failed to run Docker Compose. Make sure Docker Desktop is installed and running.\n${result.error.message}`);
  }

  process.exit(result.status ?? 1);
}

function startProject() {
  ensureProject();
  runCompose(["up", "-d"]);
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
  runCompose(["run", "--rm", "-T", "mcp"], {
    cwd: projectDir,
    env: {
      COMPOSE_PROGRESS: "quiet"
    }
  });
}

function printCodexConfig() {
  const projectDir = process.cwd();
  ensureProject(projectDir);
  const config = readConfig(projectDir);
  const apiUrl = config.apiUrl ?? "http://localhost:4000";
  const projectArg = shellQuote(projectDir);

  console.log("Codex CLI command:");
  console.log("");
  console.log(`codex mcp add localbase --env API_BASE_URL=${apiUrl} -- npx @mrace07/localbase mcp --project ${projectArg}`);
  console.log("");
  console.log("Manual config:");
  console.log("");
  console.log("[mcp_servers.localbase]");
  console.log('command = "npx"');
  console.log(`args = ["@mrace07/localbase", "mcp", "--project", ${JSON.stringify(projectDir)}]`);
  console.log("");
  console.log("[mcp_servers.localbase.env]");
  console.log(`API_BASE_URL = "${apiUrl}"`);
}

function ensureProject(projectDir = process.cwd()) {
  if (!existsSync(resolve(projectDir, "docker-compose.yml")) || !existsSync(resolve(projectDir, "localbase.config.json"))) {
    exitWith("This command must be run from a Localbase project directory. Create one with: npx @mrace07/localbase init");
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

function main() {
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
    startProject();
  } else if (command === "stop") {
    stopProject();
  } else if (command === "status") {
    statusProject();
  } else if (command === "mcp") {
    runMcp([subcommand, ...rest].filter(Boolean));
  } else if (command === "agent" && subcommand === "codex") {
    printCodexConfig();
  } else {
    exitWith(`Unknown command.\n\n${help}`);
  }
}

main();
