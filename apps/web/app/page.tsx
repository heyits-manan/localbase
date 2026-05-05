import Image from "next/image";
import logoLocalbase from "./assets/logo_localbase.png";

const setupSteps = [
  "git clone https://github.com/heyits-manan/localbase.git",
  "cd localbase",
  "pnpm install",
  "docker compose up -d postgres",
  "pnpm db:migrate",
  "pnpm dev:api",
  "pnpm --silent mcp"
];

const codexMcpSteps = [
  "codex mcp add localbase \\",
  "  --env API_BASE_URL=http://localhost:4000 \\",
  "  -- pnpm --dir /absolute/path/to/localbase --silent mcp",
  "codex mcp list",
  "codex mcp get localbase"
];

const codexConfigLines = [
  "[mcp_servers.localbase]",
  'command = "pnpm"',
  'args = ["--dir", "/absolute/path/to/localbase", "--silent", "mcp"]',
  "",
  "[mcp_servers.localbase.env]",
  'API_BASE_URL = "http://localhost:4000"'
];

const workflow = [
  { label: "Prompt", detail: "Describe the backend resource you want." },
  { label: "MCP tool", detail: "Agent calls create_resource or row tools." },
  { label: "API", detail: "Localbase validates the structured request." },
  { label: "Postgres", detail: "Real resources, fields, indexes, and metadata." },
  { label: "CRUD", detail: "Use rows through REST, MCP, or the SDK." }
];

const features = [
  {
    title: "Prompt-built resources",
    text: "Create Postgres-backed resources with typed fields, defaults, uniqueness, indexes, and metadata."
  },
  {
    title: "Agent-native MCP",
    text: "Give coding agents a safe tool surface instead of asking them to hand-write schema SQL."
  },
  {
    title: "Owned user data",
    text: "Create resources scoped by authenticated users with row access enforced by the API."
  },
  {
    title: "REST and SDK access",
    text: "Insert, list, get, update, and delete rows through the resource API or TypeScript SDK."
  }
];

const toolCalls = [
  "get_backend_summary",
  "create_resource",
  "add_field",
  "add_index",
  "insert_row",
  "update_row"
];

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-stone-700 bg-[#0d100e] p-4 text-sm leading-7 text-stone-100 shadow-2xl shadow-black/20">
      {lines.map((line) => (
        <code className="block whitespace-pre" key={line}>
          <span className="select-none text-emerald-500">$ </span>
          {line}
        </code>
      ))}
    </pre>
  );
}

export default function Home() {
  return (
    <main>
      <section className="min-h-[92vh] px-5 py-6 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-7xl items-center justify-between py-2 text-sm text-stone-300">
          <a className="flex items-center gap-3 font-semibold text-stone-50" href="#" aria-label="Localbase home">
            <Image
              src={logoLocalbase}
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-md"
            />
            <span>Localbase</span>
          </a>
          <div className="flex items-center gap-4">
            <a className="hover:text-stone-50" href="#workflow">
              Workflow
            </a>
            <a className="hover:text-stone-50" href="#install">
              Install
            </a>
            <a className="rounded-md border border-stone-600 px-3 py-2 text-stone-100 hover:border-emerald-400" href="#npx">
              npx soon
            </a>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-10 pt-20 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:pt-28">
          <div>
            <p className="mb-5 inline-flex rounded-md border border-emerald-700/70 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
              Local-first backend infrastructure for AI coding agents
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-stone-50 sm:text-6xl lg:text-7xl">
              Localbase turns agent prompts into real Postgres-backed APIs.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
              Give your coding agent a backend tool surface. It can create resources, add fields and indexes, manage rows,
              and keep schema metadata in sync without hand-writing SQL.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a className="rounded-md bg-emerald-500 px-5 py-3 text-center font-semibold text-emerald-950 hover:bg-emerald-400" href="#install">
                Try locally
              </a>
              <a className="rounded-md border border-stone-600 px-5 py-3 text-center font-semibold text-stone-100 hover:border-stone-300" href="#workflow">
                See the flow
              </a>
            </div>
          </div>

          <div className="rounded-md border border-stone-700 bg-[#0d100e] p-4 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs text-stone-500">agent prompt</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-md border border-stone-800 bg-stone-950 p-4 text-sm leading-7 text-stone-200">
                Use Localbase. Create a products resource with name text required, price integer required, and in_stock
                boolean default true.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {toolCalls.map((tool) => (
                  <div className="rounded-md border border-emerald-900/80 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100" key={tool}>
                    {tool}
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-stone-950 p-4 text-sm text-stone-300">
                <p className="mb-2 text-stone-100">Generated resource</p>
                <code className="block text-emerald-200">products(id, name, price, in_stock, created_at, updated_at)</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe5] px-5 py-20 text-stone-950 sm:px-8 lg:px-12" id="workflow">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-800">How it works</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">A controlled path from prompt to database.</h2>
          </div>
          <div className="mt-10 grid gap-3 lg:grid-cols-5">
            {workflow.map((step, index) => (
              <div className="rounded-md border border-stone-300 bg-white p-5" key={step.label}>
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-md bg-stone-950 text-sm font-semibold text-stone-50">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold">{step.label}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe5] px-5 py-10 text-stone-950 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article className="rounded-md border border-stone-300 bg-white p-5" key={feature.title}>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-stone-950 px-5 py-20 text-stone-50 sm:px-8 lg:px-12" id="install">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">Run it today</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">Start with the current local setup.</h2>
            <p className="mt-5 leading-8 text-stone-300">
              Localbase currently runs as a local workspace with Docker Postgres, an Express API, an MCP stdio server, and
              a TypeScript SDK.
            </p>
          </div>
          <CodeBlock lines={setupSteps} />
        </div>
      </section>

      <section className="bg-stone-950 px-5 py-20 text-stone-50 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">Connect agents</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">Add Localbase MCP to Codex CLI.</h2>
            <p className="mt-5 leading-8 text-stone-300">
              Start the API first, then register the MCP stdio server with Codex. Replace the absolute path with your
              Localbase checkout path.
            </p>
            <div className="mt-6 rounded-md border border-stone-700 bg-stone-900 p-4 text-sm leading-6 text-stone-300">
              Test it by asking Codex: Use the localbase MCP server. Call get_backend_summary, then list resources.
            </div>
          </div>
          <div className="space-y-4">
            <CodeBlock lines={codexMcpSteps} />
            <pre className="overflow-x-auto rounded-md border border-stone-700 bg-[#0d100e] p-4 text-sm leading-7 text-stone-100 shadow-2xl shadow-black/20">
              {codexConfigLines.map((line, index) => (
                <code className="block whitespace-pre" key={`${line}-${index}`}>
                  {line || " "}
                </code>
              ))}
            </pre>
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe5] px-5 py-20 text-stone-950 sm:px-8 lg:px-12" id="npx">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-md border border-stone-300 bg-white p-6 md:grid-cols-[1fr_1.1fr] md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-800">Coming soon</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">The npx installer is the next packaging milestone.</h2>
            <p className="mt-4 leading-7 text-stone-600">
              The command below is the intended direction, not an available installer yet. The current setup commands above
              are the source of truth until the CLI package is published.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-md bg-stone-950 p-5 text-sm leading-7 text-stone-100">
            <code>npx localbase init</code>
            <code className="block text-stone-500"># upcoming</code>
          </pre>
        </div>
      </section>
    </main>
  );
}
