import type { BackendHealth, DatasetOverview } from "@/lib/api";

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
  datasetOverview: DatasetOverview;
};

export function DashboardShell({ health, datasetOverview }: DashboardShellProps) {
  const isHealthy = health.status === "ok";
  const diagnostics = datasetOverview.diagnostics;

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

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Phase 2 Data Foundation</p>
                <h3>Local dataset diagnostics</h3>
              </div>
              <span className="count-pill">
                {datasetOverview.status === "ok" ? "Loaded" : "Unavailable"}
              </span>
            </div>

            {diagnostics ? (
              <>
                {diagnostics.warning ? (
                  <div className="warning-box">{diagnostics.warning}</div>
                ) : null}
                <div className="diagnostic-grid">
                  <div>
                    <p className="diagnostic-value">{diagnostics.ticket_count}</p>
                    <p className="diagnostic-label">Tickets parsed</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {diagnostics.actual_source_file_count}
                    </p>
                    <p className="diagnostic-label">Actual files</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {diagnostics.document_section_count}
                    </p>
                    <p className="diagnostic-label">Document sections</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">{diagnostics.faq_entry_count}</p>
                    <p className="diagnostic-label">FAQ entries</p>
                  </div>
                </div>
                <div className="source-list">
                  {datasetOverview.sources.map((source) => (
                    <div className="source-row" key={source.file_name}>
                      <div>
                        <p className="source-title">{source.file_name}</p>
                        <p>{source.role}</p>
                      </div>
                      <span className={source.exists ? "source-ok" : "source-missing"}>
                        {source.exists ? "Ready" : "Missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="dataset-unavailable">
                Dataset diagnostics will appear here when the backend is running.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
