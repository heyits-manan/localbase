import Image from "next/image";
import logoLocalbase from "./assets/logo_localbase.png";

const navItems = [
  ["Workbench", "workbench"],
  ["Flow", "flow"],
  ["Install", "install"],
  ["Tools", "tools"],
  ["FAQ", "faq"]
] as const;

const stackItems = [
  { label: "Postgres", detail: "tables, rows, indexes" },
  { label: "Resource API", detail: "localhost:4000" },
  { label: "MCP server", detail: "scoped agent tools" },
  { label: "Project CLI", detail: "init, start, doctor" }
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

const installSteps = [
  {
    title: "Check prerequisites",
    command: "node --version && docker --version",
    text: "Use Node.js 20 or newer and a running Docker installation."
  },
  {
    title: "Create a backend workspace",
    command: "npx @mrace07/localbase init my-backend",
    text: "Run this outside your app folder when you want a standalone local backend project."
  },
  {
    title: "Start Localbase",
    command: "cd my-backend && localbase start",
    text: "This starts Postgres and the API. Keep the process running while your app or agent uses it."
  },
  {
    title: "Connect Codex",
    command: "localbase agent codex --install",
    text: "Registers the project MCP server so Codex can use Localbase tools for this workspace."
  },
  {
    title: "Verify the setup",
    command: "localbase doctor",
    text: "Confirms Docker, the database, the API, and the agent configuration are reachable."
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

      <section className="relative px-5 pb-16 pt-32 sm:px-6 lg:pb-24 lg:pt-40" id="workbench">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-lime-500" />
              Local backend runtime for agent-built apps
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Give Codex a backend it can safely change.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
              Localbase runs Postgres, a resource API, and a project MCP server on your machine so agent prompts become
              inspectable backend changes instead of one-off SQL and glue code.
            </p>
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
              <p>demo.webm</p>
            </div>
            <video className="block aspect-video w-full bg-black" controls muted playsInline preload="metadata" src="/demo.webm" />
            <div className="workbench-strip hero-video-meta">
              <span>init workspace</span>
              <span>start runtime</span>
              <span>connect codex</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6" id="flow">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Command-line flow</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.36fr_0.64fr]">
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">A local backend from prompt to API.</h2>
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

      <section className="px-5 py-20 sm:px-6" id="install">
        <div className="mx-auto max-w-[1180px]">
          <div className="section-kicker">Installation</div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.34fr_0.66fr]">
            <div>
              <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">Install without guessing the order.</h2>
              <p className="mt-5 leading-8 text-zinc-400">
                These are the exact steps for a new local backend workspace, including prerequisites and the validation command.
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
              Localbase is not trying to look like a hosted dashboard. The main interface is a controlled tool surface for
              agents, plus a runtime you can validate from the terminal.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
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
