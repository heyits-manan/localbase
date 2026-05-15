import Image from "next/image";
import logoLocalbase from "./assets/logo_localbase.png";

const navItems = [
  ["Demo", "demo"],
  ["Install", "install"],
  ["Tools", "tools"],
  ["Beta", "beta"],
  ["FAQ", "faq"]
] as const;

const stackItems = [
  { label: "Postgres", detail: "real local tables" },
  { label: "Resource API", detail: "CRUD + auth" },
  { label: "MCP server", detail: "typed agent tools" },
  { label: "SDK", detail: "app-facing client" }
];

const workflow = [
  {
    title: "Create a backend workspace",
    command: "npx @mrace07/localbase init ai-memory",
    text: "Scaffold a local project with Docker Compose, environment config, and a README for the generated backend."
  },
  {
    title: "Start the local runtime",
    command: "cd ai-memory && localbase start",
    text: "Run Postgres and the Localbase API on your machine so project data stays local by default."
  },
  {
    title: "Attach Codex",
    command: "localbase agent codex --install",
    text: "Register the project MCP server so Codex can create resources, fields, relationships, rows, and users."
  }
];

const installSteps = [
  {
    title: "Check prerequisites",
    command: "node --version && docker --version",
    text: "Use Node.js 20 or newer and a running Docker installation."
  },
  {
    title: "Create the workspace",
    command: "npx @mrace07/localbase init ai-memory",
    text: "Generate the backend project separately from your app so the runtime is easy to inspect and reset."
  },
  {
    title: "Start Localbase",
    command: "cd ai-memory && localbase start",
    text: "Bring up Postgres and the API through Docker Compose."
  },
  {
    title: "Connect Codex",
    command: "localbase agent codex --install",
    text: "Point Codex at this backend through a scoped MCP server."
  },
  {
    title: "Verify the loop",
    command: "localbase doctor",
    text: "Check Docker, API health, images, and Codex MCP registration before asking the agent to build."
  }
];

const tools = [
  ["get_backend_summary", "Inspect health, resources, and auth capabilities before changing anything."],
  ["create_resource", "Create Postgres-backed resources with typed fields and ownership behavior."],
  ["create_relationship", "Connect generated resources with uuid relationship fields."],
  ["add_index", "Add lookup paths the app and agent can rely on."],
  ["insert_row", "Seed local data during an agent session."],
  ["sign_up", "Create local users for auth-owned records."]
];

const demoResources = [
  ["memories", "auth-owned notes with title, content, source, and importance"],
  ["documents", "auth-owned research inputs with title, URL, body, and status"],
  ["conversations", "auth-owned threads with summaries and saved context"],
  ["citations", "document references with quotes and notes"],
  ["outputs", "saved drafts, briefs, plans, and generated artifacts"]
];

const localFirstPoints = [
  ["Agent-safe surface", "Codex gets narrow backend tools instead of broad shell access or improvised SQL."],
  ["Inspectable state", "Resources, rows, auth, and indexes live in a local Postgres-backed runtime."],
  ["App-ready API", "Your frontend can call the generated backend through HTTP or the TypeScript SDK."],
  ["No hosted account", "The default path is Docker, localhost, and a project-scoped MCP server."]
];

const betaLimits = [
  "Developer-preview local runtime, not a hosted production backend yet.",
  "Email/password auth and auth-owned rows are the current auth surface.",
  "The web dashboard is intentionally secondary to the CLI and MCP loop.",
  "Beta feedback is focused on install failures, confusing prompts, and missing backend primitives."
];

const faqs = [
  ["What is Localbase?", "A local Postgres-backed backend runtime that AI coding agents can create, inspect, and operate through MCP."],
  ["What should I build with it first?", "Start with agent-built app backends that need structured local data, auth-owned records, relationships, and seed rows."],
  ["Does it require a hosted account?", "No. The default workflow runs locally with Docker Compose and a project-scoped MCP server."],
  ["Why not just ask the agent to write SQL?", "Localbase gives the agent typed operations for resources, fields, indexes, relationships, rows, and users, which makes the backend loop easier to inspect and repeat."],
  ["Is it production-ready?", "Not yet. It is a beta runtime for local development and AI-assisted prototyping, with hosted/deploy paths planned later."]
];

const demoPrompt =
  "Use the Localbase MCP server. Call get_backend_summary, then create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.";

function PromptLine({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p className={muted ? "text-zinc-500" : "text-zinc-100"}>
      <span className="select-none text-lime-300">$ </span>
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="site-shell min-h-screen overflow-hidden text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 text-sm text-zinc-400 sm:px-6">
          <a className="flex items-center gap-3 font-semibold text-white" href="#" aria-label="Localbase home">
            <Image src={logoLocalbase} alt="" width={32} height={32} priority className="h-8 w-8 rounded-md" />
            <span className="text-base tracking-wide">Localbase</span>
          </a>
          <div className="hidden items-center border border-zinc-800 bg-zinc-950 md:flex">
            {navItems.map(([label, target]) => (
              <a className="border-r border-zinc-800 px-4 py-2 transition last:border-r-0 hover:bg-zinc-900 hover:text-white" href={`#${target}`} key={target}>
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a className="hidden text-zinc-500 transition hover:text-white sm:inline" href="https://github.com/heyits-manan/localbase">
              GitHub
            </a>
            <a className="rounded-sm bg-white px-4 py-2 font-medium text-zinc-950 transition hover:bg-zinc-200" href="#install">
              Install
            </a>
          </div>
        </nav>
      </header>

      <section className="relative px-5 pb-16 pt-32 sm:px-6 lg:pb-24 lg:pt-40" id="demo">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-lime-500" />
              Beta runtime for agent-built apps
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Local Postgres backends your AI coding agent can build and operate.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
              Localbase gives Codex a scoped MCP tool surface for creating auth, resources, relationships, indexes, and
              rows against a real local Postgres backend.
            </p>
            <div className="mt-8 max-w-2xl border border-zinc-800 bg-zinc-950 p-4">
              <PromptLine>npx @mrace07/localbase init ai-memory</PromptLine>
              <PromptLine>cd ai-memory && localbase start</PromptLine>
              <PromptLine>localbase agent codex --install</PromptLine>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-2 border border-zinc-800 bg-zinc-950 sm:grid-cols-4">
              {stackItems.map((item) => (
                <div className="border-b border-r border-zinc-800 p-3 even:border-r-0 sm:border-b-0 sm:even:border-r sm:last:border-r-0" key={item.label}>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-video-frame">
            <div className="workbench-toolbar">
              <span />
              <span />
              <span />
              <p>ai-memory-demo.webm</p>
            </div>
            <video className="block aspect-video w-full bg-black" controls muted playsInline preload="metadata" src="/demo.webm" />
            <div className="workbench-strip hero-video-meta">
              <span>install</span>
              <span>connect codex</span>
              <span>create backend</span>
              <span>write app data</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Flagship demo</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.38fr_0.62fr]">
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">Ask Codex for an AI memory backend.</h2>
            <div>
              <p className="text-lg leading-8 text-zinc-400">
                The demo is intentionally not another CRM. It is a backend shape AI builders actually need: private memories,
                research documents, conversations, citations, and saved outputs that an app can read and write immediately.
              </p>
              <div className="mt-6 prompt-card">
                <p>{demoPrompt}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 demo-resource-grid">
            {demoResources.map(([name, description]) => (
              <article className="demo-resource" key={name}>
                <code>{name}</code>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Command-line flow</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.36fr_0.64fr]">
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">From prompt to API without backend glue.</h2>
            <p className="max-w-2xl text-lg leading-8 text-zinc-400">
              Install a project, start the local runtime, then give Codex typed backend operations. The app gets a normal
              API and SDK; the agent gets a safer way to make database changes.
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

      <section className="px-5 py-20 sm:px-6" id="install">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Installation</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.34fr_0.66fr]">
            <div>
              <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">A setup path you can verify.</h2>
              <p className="mt-5 leading-8 text-zinc-400">
                The first product bar is reliability: a clean install, a running local API, and a Codex MCP registration that
                points at the generated project.
              </p>
            </div>
            <div className="install-board">
              {installSteps.map((step, index) => (
                <article className="install-step" key={step.title}>
                  <span className="install-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                    <code>{step.command}</code>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="tools">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-zinc-800 bg-zinc-950 p-7">
            <div className="section-kicker">MCP tool surface</div>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-white">Backend actions Codex can call directly.</h2>
            <p className="mt-5 leading-8 text-zinc-400">
              Localbase is not a hosted dashboard first. The main interface is a controlled tool surface for agents, plus a
              runtime you can validate from the terminal.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {localFirstPoints.map(([label, value]) => (
                <div className="border border-zinc-800 bg-black p-4" key={label}>
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

      <section className="px-5 py-20 sm:px-6" id="beta">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Beta status</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.38fr_0.62fr]">
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">Built for early AI app builders.</h2>
            <div className="beta-panel">
              {betaLimits.map((limit) => (
                <p key={limit}>{limit}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="faq">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">FAQ</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.36fr_0.64fr]">
            <h2 className="text-4xl font-semibold leading-tight text-white">Local-first by default.</h2>
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
    </main>
  );
}
