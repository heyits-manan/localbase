import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = resolve(dirname(fileURLToPath(import.meta.url)), "../bin/localbase.js");
const packageJson = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"));

function tempDir() {
  return mkdtempSync(resolve(tmpdir(), "localbase-cli-test-"));
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? tempDir(),
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8"
  });
}

test("localbase --help prints command help", () => {
  const result = run(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Localbase CLI/);
  assert.match(result.stdout, /localbase init/);
  assert.match(result.stdout, /localbase agent codex/);
});

test("localbase --version prints package version", () => {
  const result = run(["--version"]);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), packageJson.version);
});

test("localbase init creates the expected project files with stable defaults", () => {
  const cwd = tempDir();
  const result = run(["init", "ai-memory"], { cwd });
  const projectDir = resolve(cwd, "ai-memory");

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Generated \.env, \.gitignore, docker-compose\.yml, localbase\.config\.json, and README\.md/);

  const env = readFileSync(resolve(projectDir, ".env"), "utf8");
  const gitignore = readFileSync(resolve(projectDir, ".gitignore"), "utf8");
  const compose = readFileSync(resolve(projectDir, "docker-compose.yml"), "utf8");
  const config = JSON.parse(readFileSync(resolve(projectDir, "localbase.config.json"), "utf8"));
  const readme = readFileSync(resolve(projectDir, "README.md"), "utf8");

  assert.match(env, /LOCALBASE_API_PORT=4000/);
  assert.match(env, /API_ADMIN_TOKEN=.+/);
  assert.match(gitignore, /\.env\.local/);
  assert.match(compose, /image: postgres:16/);
  assert.match(compose, /mananchataut\/localbase-api:\$\{LOCALBASE_IMAGE_TAG:-latest\}/);
  assert.match(compose, /mananchataut\/localbase-mcp:\$\{LOCALBASE_IMAGE_TAG:-latest\}/);
  assert.equal(config.apiUrl, "http://localhost:4000");
  assert.equal(config.imageTag, "latest");
  assert.match(readme, /localbase start/);
});

test("localbase init rejects invalid ports", () => {
  const result = run(["init", "bad-port", "--api-port", "70000"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--api-port must be a TCP port between 1 and 65535/);
});

test("localbase init refuses to overwrite non-empty directories without --force", () => {
  const cwd = tempDir();
  const target = resolve(cwd, "existing");
  mkdirSync(target);
  writeFileSync(resolve(target, "note.txt"), "keep me");

  const result = run(["init", "existing"], { cwd });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Target directory is not empty/);
  assert.match(result.stderr, /Use --force/);
});

test("localbase init --force can write into a non-empty directory", () => {
  const cwd = tempDir();
  const target = resolve(cwd, "existing");
  mkdirSync(target);
  writeFileSync(resolve(target, "note.txt"), "keep me");

  const result = run(["init", "existing", "--force"], { cwd });

  assert.equal(result.status, 0);
  assert.match(readFileSync(resolve(target, "docker-compose.yml"), "utf8"), /localbase-mcp/);
});

test("project commands explain when they are run outside a Localbase project", () => {
  const result = run(["start"], { cwd: tempDir() });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /This command must be run from a Localbase project directory/);
  assert.match(result.stderr, /localbase init/);
});
