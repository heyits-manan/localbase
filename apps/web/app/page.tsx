import Image from "next/image";
import logoLocalbase from "./assets/logo_localbase.png";

const quickStartSteps = [
  "npm install -g @mrace07/localbase",
  "localbase init my-backend",
  "cd my-backend",
  "localbase start",
  "localbase agent codex --install",
  "localbase doctor"
];

const oneOffSteps = [
  "npx @mrace07/localbase init my-backend",
  "cd my-backend",
  "npm install -g @mrace07/localbase",
  "localbase start"
];

const codexConfigLines = [
  "codex mcp add localbase \\",
  "  --env API_BASE_URL=http://localhost:4000 \\",
  "  -- localbase mcp --project /absolute/path/to/my-backend"
];

const workflow = [
  { label: "Install", detail: "Install the CLI from npm or run init once through npx." },
  { label: "Start", detail: "Docker Compose starts Postgres and the Localbase API locally." },
  { label: "Connect", detail: "The CLI registers the project MCP server with Codex." },
  { label: "Prompt", detail: "Ask your agent to create resources, fields, indexes, and rows." },
  { label: "Build", detail: "Use the generated REST API or SDK from your app code." }
];

const features = [
  {
    title: "Published npm CLI",
    text: "Install @mrace07/localbase, generate a project, start the stack, and connect Codex from one command-line flow."
  },
  {
    title: "Codex MCP installer",
    text: "localbase agent codex --install registers the current project so Codex uses the package, not your dev checkout."
  },
  {
    title: "Doctor checks",
    text: "localbase doctor validates Docker access, Compose, API health, runtime images, and MCP registration."
  },
  {
    title: "Local-first runtime",
    text: "Postgres, the API, and project data stay on your machine. Hosted backends can remain an explicit future mode."
  }
];

const toolCalls = [
  "get_backend_summary",
  "create_resource",
  "add_field",
  "add_index",
  "insert_row",
  "sign_up"
];

const runtimeFacts = [
  { label: "npm package", value: "@mrace07/localbase" },
  { label: "API image", value: "mananchataut/localbase-api:latest" },
  { label: "MCP image", value: "mananchataut/localbase-mcp:latest" },
  { label: "API URL", value: "http://localhost:4000" }
];

function CodeBlock({ lines, prompt = true }: { lines: string[]; prompt?: boolean }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-stone-700 bg-[#0d100e] p-4 text-sm leading-7 text-stone-100 shadow-2xl shadow-black/20">
      {lines.map((line, index) => (
        <code className="block whitespace-pre" key={`${line}-${index}`}>
          {prompt ? <span className="select-none text-emerald-500">$ </span> : null}
          {line || " "}
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
            <a className="hover:text-stone-50" href="#demo">
              Demo
            </a>
            <a className="hover:text-stone-50" href="#workflow">
              Workflow
            </a>
            <a className="rounded-md border border-stone-600 px-3 py-2 text-stone-100 hover:border-emerald-400" href="#install">
              Install
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
              Install the CLI, start a local Docker runtime, and connect Codex through MCP. Your agent gets safe tools for
              resources, fields, indexes, rows, and auth-owned data without writing schema SQL by hand.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a className="rounded-md bg-emerald-500 px-5 py-3 text-center font-semibold text-emerald-950 hover:bg-emerald-400" href="#install">
                Start locally
              </a>
              <a className="rounded-md border border-stone-600 px-5 py-3 text-center font-semibold text-stone-100 hover:border-stone-300" href="#demo">
                Watch demo
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
              <span className="text-xs text-stone-500">codex prompt</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-md border border-stone-800 bg-stone-950 p-4 text-sm leading-7 text-stone-200">
                Use the localbase MCP server. Create a products resource with name text required, price integer required,
                and in_stock boolean default true.
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

      <section className="bg-[#f3efe5] px-5 py-20 text-stone-950 sm:px-8 lg:px-12" id="demo">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-emerald-800">Demo</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">See Localbase connect Codex to a local backend.</h2>
              <p className="mt-5 leading-8 text-stone-700">
                The demo shows the package workflow: initialize a project, start the Docker runtime, register MCP, and let
                Codex inspect or change backend resources through Localbase tools.
              </p>
            </div>
            <div className="overflow-hidden rounded-md border border-stone-300 bg-stone-950 shadow-2xl shadow-stone-900/20">
              <video
                className="aspect-video w-full bg-stone-950"
                controls
                muted
                playsInline
                preload="metadata"
                src="/demo.webm"
              />
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
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">Install</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">One package, local runtime, Codex-ready MCP.</h2>
            <p className="mt-5 leading-8 text-stone-300">
              The CLI scaffolds a project, starts Postgres and the API through Docker Compose, registers Codex MCP for
              the current project, and checks the setup with doctor.
            </p>
          </div>
          <CodeBlock lines={quickStartSteps} />
        </div>
      </section>

      <section className="bg-stone-950 px-5 py-20 text-stone-50 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">Codex MCP</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal sm:text-5xl">Install the MCP registration from inside the project.</h2>
            <p className="mt-5 leading-8 text-stone-300">
              Run the installer once per generated project. Codex then launches the npm package's MCP server directly,
              pointed at the project and API URL.
            </p>
            <div className="mt-6 rounded-md border border-stone-700 bg-stone-900 p-4 text-sm leading-6 text-stone-300">
              After installing, restart Codex from a shell where <code>docker ps</code> works, then ask it to call
              <code> get_backend_summary</code>.
            </div>
          </div>
          <div className="space-y-4">
            <CodeBlock lines={["localbase agent codex --install", "codex mcp get localbase"]} />
            <CodeBlock lines={codexConfigLines} prompt={false} />
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe5] px-5 py-20 text-stone-950 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-800">Runtime details</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-normal">Published pieces and diagnostics.</h2>
            <p className="mt-5 leading-8 text-stone-700">
              Runtime Docker images default to <code>latest</code>, so CLI patch releases do not require republishing
              matching image tags. Use <code>localbase doctor</code> when Docker, ports, images, or MCP registration need
              checking.
            </p>
          </div>
          <div className="grid gap-3">
            {runtimeFacts.map((fact) => (
              <div className="grid gap-2 rounded-md border border-stone-300 bg-white p-4 sm:grid-cols-[10rem_1fr]" key={fact.label}>
                <span className="text-sm font-semibold text-stone-500">{fact.label}</span>
                <code className="break-words text-sm text-stone-950">{fact.value}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3efe5] px-5 py-20 text-stone-950 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-md border border-stone-300 bg-white p-6 md:grid-cols-[1fr_1.1fr] md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-800">One-off init</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">Use npx for the first project, then the installed binary.</h2>
            <p className="mt-4 leading-7 text-stone-600">
              This is useful for trying Localbase without a global install first. The generated project still recommends
              <code> localbase</code> for start, doctor, and MCP setup.
            </p>
          </div>
          <CodeBlock lines={oneOffSteps} />
        </div>
      </section>
    </main>
  );
}
