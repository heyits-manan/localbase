import Image from "next/image";
import logoLocalbase from "./assets/logo_localbase.png";

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
  ["App-ready surface", "Your frontend can use HTTP or the TypeScript SDK immediately after the agent creates the backend."],
  ["No hosted account", "The default path is Docker, localhost, and a project-scoped MCP server."]
];

const betaLimits = [
  "Local development runtime, not a hosted production backend yet.",
  "Email/password auth and auth-owned rows are the current auth surface.",
  "No dashboard-first workflow yet; CLI plus MCP is the core loop.",
  "Beta feedback should focus on install failures, confusing prompts, and missing backend primitives."
];

const faqs = [
  ["What is Localbase?", "A local Postgres-backed backend runtime that AI coding agents can create, inspect, and operate through MCP."],
  ["What should I build first?", "Start with agent-built app backends that need structured local data, auth-owned records, relationships, and seed rows."],
  ["Does it require a hosted account?", "No. The current workflow runs locally with Docker Compose and a project-scoped MCP server."],
  ["Why not just ask the agent to write SQL?", "Localbase gives the agent typed operations for resources, fields, indexes, relationships, rows, and users, which makes the backend loop easier to inspect and repeat."],
  ["Is it production-ready?", "Not yet. It is a beta runtime for local development and AI-assisted prototyping, with hosted or deploy paths planned later."]
];

const demoPrompt =
  "Use the Localbase MCP server. Create a backend for an AI research assistant with auth-owned memories, documents, conversations, citations, and saved outputs. Add useful indexes, insert sample rows, then list the resources.";

function CommandStack() {
  return (
    <div className="command-stack" aria-label="Install commands">
      {installCommands.map((command) => (
        <code key={command}>
          <span>$</span>
          {command}
        </code>
      ))}
    </div>
  );
}

function RuntimeMap() {
  return (
    <div className="runtime-map" aria-hidden="true">
      <div className="runtime-node runtime-node-agent">
        <span>Codex</span>
        <strong>MCP client</strong>
      </div>
      <div className="runtime-node runtime-node-mcp">
        <span>Localbase MCP</span>
        <strong>20 tools</strong>
      </div>
      <div className="runtime-node runtime-node-api">
        <span>Local API</span>
        <strong>CRUD + auth</strong>
      </div>
      <div className="runtime-node runtime-node-db">
        <span>Postgres</span>
        <strong>local volume</strong>
      </div>
      <div className="runtime-console">
        <p>get_backend_summary</p>
        <p>create_resource memories ownedByUser=true</p>
        <p>add_index memories.importance</p>
        <p>insert_row outputs kind=note</p>
      </div>
      <div className="runtime-schema">
        {demoResources.slice(0, 4).map(([name, mode]) => (
          <div key={name}>
            <span>{name}</span>
            <small>{mode}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <nav className="topbar-inner" aria-label="Main navigation">
          <a className="brand" href="#" aria-label="Localbase home">
            <Image src={logoLocalbase} alt="" width={34} height={34} priority />
            <span>Localbase</span>
          </a>
          <div className="nav-links">
            {navItems.map(([label, target]) => (
              <a href={`#${target}`} key={target}>
                {label}
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <a href="https://github.com/heyits-manan/localbase">GitHub</a>
            <a className="button button-light" href="#install">
              Install
            </a>
          </div>
        </nav>
      </header>

      <section className="hero" id="demo">
        <RuntimeMap />
        <div className="hero-inner">
          <p className="eyebrow">Local-first beta runtime for AI-built apps</p>
          <h1>Local Postgres backends your AI coding agent can build and operate.</h1>
          <p className="hero-copy">
            Localbase gives Codex a project-scoped MCP surface for creating auth, resources, relationships, indexes, and
            rows against a real local Postgres backend.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#install">
              Start locally
            </a>
            <a className="button button-dark" href="#demo-video">
              Watch demo
            </a>
          </div>
          <CommandStack />
        </div>
        <div className="hero-signals" aria-label="Runtime signals">
          {runtimeSignals.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="proof-band" aria-label="Product proof">
        <p>Agent creates backend schema</p>
        <p>App writes through SDK</p>
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
          </div>
          <div className="schema-panel">
            <p className="panel-label">Generated schema</p>
            {demoResources.map(([name, mode, fields]) => (
              <div className="schema-line" key={name}>
                <div>
                  <strong>{name}</strong>
                  <span>{fields}</span>
                </div>
                <small>{mode}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="prompt-strip">
          <span>Canonical prompt</span>
          <p>{demoPrompt}</p>
        </div>
      </section>

      <section className="section install-section" id="install">
        <div className="section-heading compact">
          <p className="section-kicker">Install flow</p>
          <h2>Three commands from empty folder to agent-operated backend.</h2>
        </div>
        <div className="timeline">
          {workflow.map((step) => (
            <article className="timeline-step" key={step.label}>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <code>{step.command}</code>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section tool-section" id="tools">
        <div className="tool-intro">
          <p className="section-kicker">MCP tool surface</p>
          <h2>Backend operations the agent can call directly.</h2>
          <p>
            Localbase turns backend setup into inspectable tool calls: summarize, create resources, add indexes, seed rows,
            and test auth-owned data without hand-written SQL.
          </p>
        </div>
        <div className="tool-groups">
          {toolGroups.map((group) => (
            <article className="tool-group" key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {group.tools.map((tool) => (
                  <code key={tool}>{tool}</code>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section local-first-section" id="local-first">
        <div className="section-heading">
          <p className="section-kicker">Why local-first</p>
          <h2>Keep the agent loop fast, bounded, and inspectable.</h2>
        </div>
        <div className="principle-grid">
          {localFirstPoints.map(([title, text]) => (
            <article className="principle" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section beta-section" id="beta">
        <div>
          <p className="section-kicker">Beta status</p>
          <h2>Developer preview, with the rough edges named upfront.</h2>
        </div>
        <div className="limit-list">
          {betaLimits.map((limit) => (
            <p key={limit}>{limit}</p>
          ))}
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading compact">
          <p className="section-kicker">FAQ</p>
          <h2>Local-first by default.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
