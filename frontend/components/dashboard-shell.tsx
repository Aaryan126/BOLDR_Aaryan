import type {
  BackendHealth,
  ClassificationOverview,
  DatasetOverview,
} from "@/lib/api";

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
    value: "Complete",
    tone: "green",
  },
  {
    title: "Phase 2",
    label: "Local dataset ingestion and diagnostics",
    value: "Complete",
    tone: "blue",
  },
  {
    title: "Phase 3",
    label: "Deterministic classification baseline",
    value: "Active",
    tone: "gold",
  },
];

const upcomingModules = [
  {
    title: "Phase 4",
    body: "Build retrieval evidence with source priority and conflict handling.",
  },
  {
    title: "Phase 5",
    body: "Add the Qwen adapter and structured AI output contracts.",
  },
  {
    title: "Phase 6",
    body: "Generate grounded draft replies only after evidence checks.",
  },
];

type DashboardShellProps = {
  health: BackendHealth;
  datasetOverview: DatasetOverview;
  classificationOverview: ClassificationOverview;
};

export function DashboardShell({
  health,
  datasetOverview,
  classificationOverview,
}: DashboardShellProps) {
  const isHealthy = health.status === "ok";
  const diagnostics = datasetOverview.diagnostics;
  const evaluation = classificationOverview.evaluation;

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
                <p className="eyebrow">Phase 3 Baseline</p>
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

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Phase 3 Intelligence Baseline</p>
                <h3>Deterministic classification</h3>
              </div>
              <span className="count-pill">
                {classificationOverview.status === "ok" ? "Ready" : "Unavailable"}
              </span>
            </div>

            {evaluation ? (
              <>
                <div className="diagnostic-grid">
                  <div>
                    <p className="diagnostic-value">
                      {evaluation.classified_tickets}
                    </p>
                    <p className="diagnostic-label">Tickets classified</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {Object.keys(evaluation.required_persona_counts).length}
                    </p>
                    <p className="diagnostic-label">Required personas used</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {evaluation.order_lookup_required_count}
                    </p>
                    <p className="diagnostic-label">Order lookups</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {evaluation.knowledge_gap_count}
                    </p>
                    <p className="diagnostic-label">Knowledge gaps</p>
                  </div>
                </div>
                <div className="persona-list">
                  {evaluation.final_personas.map((persona) => (
                    <div className="persona-row" key={persona}>
                      <span>{persona}</span>
                      <strong>{evaluation.required_persona_counts[persona] ?? 0}</strong>
                    </div>
                  ))}
                </div>
                <div className="note-box">
                  Transactional remains an operational tag only:
                  {" "}
                  {evaluation.exposes_transactional_persona ? "Needs review" : "Confirmed"}
                  . Escalation label alignment:
                  {" "}
                  {Math.round(evaluation.escalation_accuracy * 100)}
                  %.
                </div>
              </>
            ) : (
              <p className="dataset-unavailable">
                Classification summary will appear here when the backend is running.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
