import Image from "next/image";
import logoLocalbase from "./assets/logo_localbase.png";

const navItems = [
  ["Workbench", "workbench"],
  ["Flow", "flow"],
  ["Demo", "demo"],
  ["Tools", "tools"],
  ["FAQ", "faq"]
] as const;

const stackItems = [
  { label: "Postgres", detail: "project data, resources, indexes" },
  { label: "API", detail: "REST endpoints on localhost:4000" },
  { label: "MCP", detail: "Codex-safe backend operations" },
  { label: "CLI", detail: "init, start, doctor, agent install" }
];

const workflow = [
  {
    title: "Create a workspace",
    command: "npx @mrace07/localbase init my-backend",
    text: "Scaffold a local backend project with the files needed to run the API and database together."
  },
  {
    title: "Start the runtime",
    command: "localbase start",
    text: "Docker Compose brings up Postgres and the Localbase API without sending project data to a hosted service."
  },
  {
    title: "Attach Codex",
    command: "localbase agent codex --install",
    text: "Register the project MCP server so Codex can inspect and change resources through typed tools."
  }
];

const tools = [
  ["get_backend_summary", "Read resources, auth status, and available actions."],
  ["create_resource", "Add a Postgres-backed API resource."],
  ["add_field", "Attach typed fields with required/default behavior."],
  ["add_index", "Create lookup paths for generated resources."],
  ["insert_row", "Seed project data during an agent session."],
  ["sign_up", "Create local users for auth-owned records."]
];

const facts = [
  ["Runtime", "Postgres + API in Docker"],
  ["Agent surface", "MCP tools, not broad shell scripts"],
  ["Default API", "http://localhost:4000"],
  ["Validation", "localbase doctor"]
];

const faqs = [
  ["What is Localbase?", "A local-first backend runtime that lets AI coding agents create and inspect Postgres-backed APIs."],
  ["Does it require a hosted account?", "No. The default workflow runs locally with Docker Compose and a local MCP server."],
  ["Why use MCP?", "MCP gives Codex narrow backend operations such as creating resources, fields, indexes, rows, and users."],
  ["Can app code call the generated backend?", "Yes. The generated API and SDK are intended to be used directly from your application."]
];

function PromptLine({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p className={muted ? "text-zinc-500" : "text-zinc-200"}>
      <span className="select-none text-emerald-300">$ </span>
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="site-shell min-h-screen overflow-hidden text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090b0a]/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-4 text-sm text-zinc-300 sm:px-6">
          <a className="flex items-center gap-2 font-semibold text-white" href="#" aria-label="Localbase home">
            <Image src={logoLocalbase} alt="" width={28} height={28} priority className="h-7 w-7 rounded-md" />
            <span className="text-base">Localbase</span>
          </a>
          <div className="hidden items-center rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex">
            {navItems.map(([label, target]) => (
              <a className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white" href={`#${target}`} key={target}>
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a className="hidden text-zinc-400 transition hover:text-white sm:inline" href="https://github.com/heyits-manan/localbase">
              GitHub
            </a>
            <a className="rounded-md bg-emerald-300 px-4 py-2 font-medium text-black transition hover:bg-emerald-200" href="#install">
              Install
            </a>
          </div>
        </nav>
      </header>

      <section className="relative px-5 pb-20 pt-36 sm:px-6 lg:pb-28 lg:pt-44" id="workbench">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Local backend runtime for agent-built apps
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-medium leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Give Codex a backend it can safely change.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
              Localbase runs Postgres, a resource API, and a project MCP server on your machine so agent prompts become
              inspectable backend changes instead of one-off SQL and glue code.
            </p>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {stackItems.map((item) => (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3" key={item.label}>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="workbench-panel">
            <div className="workbench-toolbar">
              <span />
              <span />
              <span />
              <p>localbase/workbench</p>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_0.78fr]">
              <div className="terminal-pane">
                <PromptLine>localbase init crm-agent</PromptLine>
                <p className="text-zinc-500">created docker-compose.yml, .env.example, localbase.config.json</p>
                <PromptLine>localbase start</PromptLine>
                <p className="text-emerald-300">api ready on http://localhost:4000</p>
                <PromptLine>localbase agent codex --install</PromptLine>
                <p className="text-zinc-500">registered MCP server for this project</p>
                <PromptLine muted>localbase doctor</PromptLine>
              </div>
              <div className="schema-pane">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-white">resources</p>
                  <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">healthy</span>
                </div>
                {["contacts", "companies", "notes", "activities"].map((table) => (
                  <div className="schema-row" key={table}>
                    <span>{table}</span>
                    <code>id uuid</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="workbench-strip">
              <span>mcp.connected</span>
              <span>postgres.local</span>
              <span>api.healthy</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="flow">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Command-line flow</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.36fr_0.64fr]">
            <h2 className="text-4xl font-medium leading-tight text-white sm:text-5xl">A local backend from prompt to API.</h2>
            <p className="max-w-2xl text-lg leading-8 text-zinc-400">
              The product shape is intentionally narrow: install a project, start the local runtime, then expose specific
              backend tools to Codex. That keeps the UI, API, and database behavior traceable during an AI coding session.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {workflow.map((step, index) => (
              <article className="flow-card" key={step.title}>
                <span className="flow-index">0{index + 1}</span>
                <h3>{step.title}</h3>
                <code>{step.command}</code>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="demo">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:items-center">
          <div>
            <div className="section-kicker">Demo</div>
            <h2 className="mt-5 text-4xl font-medium leading-tight text-white sm:text-5xl">Watch Localbase wire up a project.</h2>
            <p className="mt-5 leading-8 text-zinc-400">
              The demo walks through the local workflow: initialize a backend, start the runtime, register Codex through
              MCP, and inspect the generated backend surface.
            </p>
          </div>
          <div className="demo-frame">
            <div className="workbench-toolbar">
              <span />
              <span />
              <span />
              <p>demo.webm</p>
            </div>
            <video className="block aspect-video w-full bg-black" controls muted playsInline preload="metadata" src="/demo.webm" />
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="tools">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-md border border-white/10 bg-zinc-950/60 p-7">
            <div className="section-kicker">MCP tool surface</div>
            <h2 className="mt-5 text-4xl font-medium leading-tight text-white">Backend actions Codex can call directly.</h2>
            <p className="mt-5 leading-8 text-zinc-400">
              Localbase is not trying to look like a hosted dashboard. The main interface is a controlled tool surface for
              agents, plus a runtime you can validate from the terminal.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4" key={label}>
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="tool-grid">
            {tools.map(([name, description]) => (
              <article className="tool-card" key={name}>
                <code>{name}</code>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="faq">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">FAQ</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.36fr_0.64fr]">
            <h2 className="text-4xl font-medium leading-tight text-white">Local-first by default.</h2>
            <div className="space-y-3">
              {faqs.map(([question, answer]) => (
                <details className="faq-item" key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-28 pt-12 sm:px-6" id="install">
        <div className="mx-auto max-w-[1180px] rounded-md border border-emerald-300/25 bg-emerald-300/[0.06] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.46fr_0.54fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-medium text-white">Install the local runtime.</h2>
              <p className="mt-3 leading-7 text-zinc-400">Start with npx, then use the generated project commands.</p>
            </div>
            <div className="rounded-md bg-black/70 p-4">
              <PromptLine>npx @mrace07/localbase init my-backend</PromptLine>
              <PromptLine>cd my-backend && localbase start</PromptLine>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
