import Image from "next/image";
import demoVideo from "./assets/demo.webm";
import logoLocalbase from "./assets/logo_localbase.png";

<<<<<<< HEAD
const navItems = [
  ["Demo", "demo-video"],
  ["Install", "install"],
  ["Tools", "tools"],
  ["Local-first", "local-first"],
  ["Beta", "beta"]
] as const;

const installCommands = [
  "npx @mrace07/localbase init ai-memory",
  "cd ai-memory && localbase start",
  "localbase agent codex --install"
];

const runtimeSignals = [
  ["Runtime", "Docker + Postgres 16"],
  ["API", "localhost:4000"],
  ["Agent", "Codex MCP"],
  ["Data", "local project volume"]
];

const workflow = [
  {
    label: "01",
    title: "Scaffold a backend workspace",
    command: "npx @mrace07/localbase init ai-memory",
    text: "Creates the project README, Docker Compose runtime, local config, and secrets template."
  },
  {
    label: "02",
    title: "Start the local runtime",
    command: "cd ai-memory && localbase start",
    text: "Runs Postgres and the Localbase API on your machine with stable generated defaults."
  },
  {
    label: "03",
    title: "Give Codex backend tools",
    command: "localbase agent codex --install",
    text: "Registers a project-scoped MCP server so the agent can create schema and data safely."
  }
];

const demoResources = [
  ["memories", "auth-owned", "title, content, source, importance"],
  ["documents", "auth-owned", "title, url, body, status"],
  ["conversations", "auth-owned", "title, summary"],
  ["citations", "relationship", "document_id, quote, note"],
  ["outputs", "auth-owned", "title, kind, content"]
];

const toolGroups = [
  {
    title: "Inspect",
    tools: ["get_backend_summary", "list_resources", "describe_resource"]
  },
  {
    title: "Shape",
    tools: ["create_resource", "add_field", "add_index", "create_relationship"]
  },
  {
    title: "Use",
    tools: ["sign_up", "sign_in", "insert_row", "list_rows"]
  }
];

const localFirstPoints = [
  ["Bounded agent access", "Codex gets typed backend operations instead of broad shell access or improvised SQL."],
  ["Inspectable state", "Resources, rows, users, indexes, and relationships live in a local Postgres-backed runtime."],
  ["App-ready surface", "Your frontend can use the REST API directly via HTTP immediately after the agent creates the backend."],
  ["No hosted account", "The default path is Docker, localhost, and a project-scoped MCP server."]
];

const betaLimits = [
  "Local development runtime, not a hosted production backend yet.",
  "Email/password auth and auth-owned rows are the current auth surface.",
  "No dashboard-first workflow yet; CLI plus MCP is the core loop.",
  "Beta feedback should focus on install failures, confusing prompts, and missing backend primitives."
=======
const adapters = [
  "Postgres",
  "Auth",
  "Resources",
  "Indexes",
  "Relationships",
  "Seed rows",
  "MCP",
  "SDK",
  "Docker",
  "CLI",
  "Codex",
  "REST API",
  "Local users",
  "Audit logs"
>>>>>>> 48ea2255dc82e13eafc706355fb26c06604964d8
];

const features = [
  ["Risk Assessment", "Codex gets typed backend operations instead of broad shell access or improvised SQL."],
  ["Credential Injection", "Project config stays local while the agent works through a scoped MCP server."],
  ["Audit Trail", "Resources, rows, indexes, auth, and relationships are inspectable in the generated backend."]
];

const teamCards = ["Private local runtime", "Project-scoped MCP", "Postgres data model", "CLI-first workflow"];

export default function Home() {
  return (
    <main className="site-shell min-h-screen text-zinc-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090b10]/95 backdrop-blur-md">
        <nav className="mx-auto flex h-[70px] max-w-[1120px] items-center justify-between px-5 text-sm text-slate-400">
          <a className="flex items-center gap-3 font-semibold text-white" href="#" aria-label="Localbase home">
            <Image src={logoLocalbase} alt="" width={30} height={30} priority className="h-[30px] w-[30px] rounded-md" />
            <span className="text-lg">Localbase</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a className="transition hover:text-white" href="#self-host">
              Self-Host
            </a>
            <a className="transition hover:text-white" href="#how">
              How it works
            </a>
            <a className="transition hover:text-white" href="#adapters">
              Tools
            </a>
            <a className="github-pill" href="https://github.com/heyits-manan/localbase">
              GitHub
            </a>
            <a className="primary-button small" href="#start">
              Get Started
            </a>
          </div>
        </nav>
      </header>

      <section className="hero-section">
        <div className="mx-auto grid max-w-[1120px] gap-12 px-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div>
            <h1 className="max-w-[560px] text-5xl font-bold leading-[1.05] tracking-normal text-white sm:text-6xl">
              Your agent builds.
              <span className="block text-[#8589ff]">Your data stays local.</span>
            </h1>
            <p className="mt-7 max-w-[520px] text-xl leading-8 text-slate-300">
              Localbase gives Codex a scoped MCP surface for creating auth, resources, relationships, indexes, and rows
              against a real local Postgres backend.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a className="primary-button" href="#start">
                Get Started Free
              </a>
              <a className="secondary-button" href="#how">
                How It Works
              </a>
            </div>
          </div>

          <div className="orbit" aria-hidden="true">
            <div className="orbit-core">
              <Image src={logoLocalbase} alt="" width={78} height={78} className="h-[78px] w-[78px] rounded-2xl" />
            </div>
            <span className="orbit-node node-one">DB</span>
            <span className="orbit-node node-two">API</span>
            <span className="orbit-node node-three">CLI</span>
            <span className="orbit-node node-four">SDK</span>
            <span className="orbit-node node-five">MCP</span>
            <span className="orbit-node node-six">Auth</span>
          </div>
        </div>
      </section>

<<<<<<< HEAD
      <section className="proof-band" aria-label="Product proof">
        <p>Agent creates backend schema</p>
        <p>App writes through API</p>
        <p>Data stays local by default</p>
      </section>

      <section className="section demo-section" id="demo-video">
        <div className="section-heading">
          <p className="section-kicker">Flagship demo</p>
          <h2>Ask Codex for an AI memory backend, then use it from an app.</h2>
          <p>
            The demo is intentionally not another CRM. It is the backend shape AI builders actually need: private memories,
            research documents, conversations, citations, and saved outputs.
          </p>
        </div>

        <div className="demo-layout">
          <div className="video-shell">
            <div className="video-toolbar">
              <span>ai-memory-demo.webm</span>
              <small>install {"->"} connect {"->"} create {"->"} write</small>
            </div>
            <video controls muted playsInline preload="metadata" src="/demo.webm" />
=======
      <section className="section-block pt-12" id="start">
        <div className="mx-auto max-w-[760px] px-5 text-center">
          <div className="number-heading">
            <span>1</span>
            <h2>Get started</h2>
>>>>>>> 48ea2255dc82e13eafc706355fb26c06604964d8
          </div>
          <p className="mt-4 text-slate-400">No hosted account required. Install locally and connect your agent in minutes.</p>
          <div className="cloud-card mt-5">
            <div className="text-left">
              <h3>Start a Localbase workspace</h3>
              <p>Docker, Postgres, API config, and MCP setup from your terminal.</p>
            </div>
            <a className="primary-button" href="#self-host">
              Install Localbase
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[760px] gap-5 px-5 md:grid-cols-2">
          <article className="setup-card">
            <div className="card-title">
              <span>2</span>
              <h3>Connect your agent</h3>
            </div>
            <p>Install the scoped MCP server so Codex can make backend changes through Localbase.</p>
            <pre>{`> npx @mrace07/localbase init ai-memory
OK Localbase project created
OK MCP server ready on localhost`}</pre>
          </article>
          <article className="setup-card">
            <div className="card-title">
              <span>3</span>
              <h3>Give it tasks</h3>
            </div>
            <p>Approve backend changes, inspect generated resources, and keep the data on your machine.</p>
            <div className="approval-box">
              <strong>APPROVE</strong>
              <p>Create auth-owned memories and documents</p>
              <small>resources.create / indexes.add / rows.insert</small>
              <button>Approve</button>
            </div>
          </article>
        </div>
      </section>

      <section className="section-block" id="how">
        <div className="mx-auto max-w-[980px] px-5">
          <h2 className="center-title">How it works</h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="step-list">
              <div className="active">
                <span>1</span>
                Give your agent a task
              </div>
              <div>
                <span>2</span>
                Approve the change
              </div>
              <div>
                <span>3</span>
                Every request is typed
              </div>
            </div>
            <div>
              <p className="mb-6 text-lg leading-8 text-slate-300">
                "Create a backend for an AI research assistant." Codex figures out the resources it needs and calls the
                Localbase MCP tools.
              </p>
              <div className="chat-panel">
                <div className="chat-row user">Create memories, documents, conversations, citations, and saved outputs.</div>
                <div className="chat-row agent">
                  <span>I will need access to:</span>
                  <code>create_resource</code>
                  <code>create_relationship</code>
                  <code>insert_row</code>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 grid gap-7 md:grid-cols-3">
            {features.map(([title, text]) => (
              <article className="feature" key={title}>
                <span className="feature-icon">+</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="video-band" id="self-host">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <h2>Self-hosted by default</h2>
            <p>
              The demo video lives in the app assets folder and is imported into this UI. It shows the local workflow
              instead of relying on an external embed.
            </p>
          </div>
          <div className="video-frame">
            <video controls muted playsInline preload="metadata" src={demoVideo} />
          </div>
        </div>
      </section>

      <section className="section-block" id="adapters">
        <div className="mx-auto max-w-[980px] px-5 text-center">
          <h2 className="center-title">14 backend tools and counting</h2>
          <p className="mt-4 text-lg text-slate-300">Every operation gets a narrow interface, local state, and a repeatable command path.</p>
          <div className="adapter-cloud">
            {adapters.map((adapter) => (
              <span key={adapter}>{adapter}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="team-section">
        <div className="mx-auto max-w-[860px] px-5 text-center">
          <h2 className="center-title">Localbase for teams</h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Managed local development with reproducible setup, visible schema changes, and project-level agent access.
          </p>
          <div className="team-grid">
            {teamCards.map((card) => (
              <article key={card}>
                <span>+</span>
                <h3>{card}</h3>
              </article>
            ))}
          </div>
          <a className="primary-button mt-10 inline-flex" href="https://github.com/heyits-manan/localbase">
            Contact us
          </a>
        </div>
      </section>
    </main>
  );
}
