import type { BackendHealth } from "@/lib/api";

const navigationItems = [
  "Inbox Intelligence",
  "Ticket Review",
  "Knowledge Gaps",
  "Theme Radar",
  "Marketing Brief",
  "External Benchmarking",
];

const phaseCards = [
  {
    title: "Phase 1",
    label: "Repository and app scaffold",
    value: "Active",
    tone: "green",
  },
  {
    title: "Core Scope",
    label: "Local dataset first; Gmail and Shopify later",
    value: "Defined",
    tone: "blue",
  },
  {
    title: "Guardrail",
    label: "Drafts require human approval",
    value: "Locked",
    tone: "gold",
  },
];

const upcomingModules = [
  {
    title: "Phase 2",
    body: "Parse the six actual files in Boldr Data and expose dataset diagnostics.",
  },
  {
    title: "Phase 3",
    body: "Add deterministic ticket classification, required persona mapping, and routing tags.",
  },
  {
    title: "Phase 4",
    body: "Build retrieval evidence with source priority and conflict handling.",
  },
];

type DashboardShellProps = {
  health: BackendHealth;
};

export function DashboardShell({ health }: DashboardShellProps) {
  const isHealthy = health.status === "ok";

  return (
    <main className="workbench">
      <div className="workbench-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <p className="eyebrow">BOLDR</p>
            <h1>Revenue Rocket</h1>
          </div>
          <nav className="sidebar-nav" aria-label="Workbench navigation">
            {navigationItems.map((item, index) => (
              <a
                href="#"
                key={item}
                className={index === 0 ? "nav-link nav-link-active" : "nav-link"}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="content">
          <header className="hero-panel">
            <div className="hero-content">
              <div>
                <p className="eyebrow">Phase 1 Scaffold</p>
                <h2>
                  Customer Intelligence Workbench
                </h2>
                <p className="hero-copy">
                  The foundation is ready for the BOLDR challenge flow: ingest
                  local tickets, ground answers in knowledge sources, flag gaps,
                  and turn support themes into marketing intelligence.
                </p>
              </div>
              <div
                className={
                  isHealthy ? "health-badge health-good" : "health-badge health-bad"
                }
              >
                Backend: {isHealthy ? "Connected" : "Unavailable"}
              </div>
            </div>
          </header>

          <section className="metric-grid">
            {phaseCards.map((card) => (
              <article
                key={card.title}
                className="metric-card"
              >
                <div className={`tone-bar tone-${card.tone}`} />
                <p className="card-kicker">
                  {card.title}
                </p>
                <h3>
                  {card.value}
                </h3>
                <p>
                  {card.label}
                </p>
              </article>
            ))}
          </section>

          <section className="detail-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Workbench Areas</p>
                  <h3>
                    Core navigation is in place
                  </h3>
                </div>
                <span className="count-pill">
                  6 areas
                </span>
              </div>
              <div className="module-grid">
                {navigationItems.map((item) => (
                  <div
                    key={item}
                    className="module-card"
                  >
                    <p className="module-title">{item}</p>
                    <p>
                      {item === "External Benchmarking"
                        ? "Bonus challenge placeholder for market sentiment comparison."
                        : "Core challenge workspace ready for Phase 2 data wiring."}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <p className="eyebrow">Next Build Steps</p>
              <h3>
                Foundation before AI
              </h3>
              <div className="timeline">
                {upcomingModules.map((module) => (
                  <div
                    key={module.title}
                    className="timeline-item"
                  >
                    <p className="timeline-title">{module.title}</p>
                    <p>
                      {module.body}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}
