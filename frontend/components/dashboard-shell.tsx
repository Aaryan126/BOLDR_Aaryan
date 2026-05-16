import type {
  AIOverview,
  BackendHealth,
  ClassificationOverview,
  DatasetOverview,
  DraftOverview,
  RetrievalOverview,
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
    title: "Phase 2",
    label: "Local dataset ingestion and diagnostics",
    value: "Complete",
    tone: "blue",
  },
  {
    title: "Phase 4",
    label: "Retrieval evidence and source priority",
    value: "Complete",
    tone: "purple",
  },
  {
    title: "Phase 5",
    label: "GLM-5.1 provider and structured outputs",
    value: "Complete",
    tone: "green",
  },
  {
    title: "Phase 6",
    label: "Grounded draft replies and guardrails",
    value: "Active",
    tone: "gold",
  },
];

const upcomingModules = [
  {
    title: "Phase 7",
    body: "Stabilize workflow APIs for review, approval, and batch processing.",
  },
  {
    title: "Phase 8",
    body: "Turn the dashboard into a full ticket review and gap-management workbench.",
  },
];

type DashboardShellProps = {
  health: BackendHealth;
  datasetOverview: DatasetOverview;
  classificationOverview: ClassificationOverview;
  retrievalOverview: RetrievalOverview;
  aiOverview: AIOverview;
  draftOverview: DraftOverview;
};

export function DashboardShell({
  health,
  datasetOverview,
  classificationOverview,
  retrievalOverview,
  aiOverview,
  draftOverview,
}: DashboardShellProps) {
  const isHealthy = health.status === "ok";
  const diagnostics = datasetOverview.diagnostics;
  const evaluation = classificationOverview.evaluation;
  const retrievalEvaluation = retrievalOverview.evaluation;
  const aiStatus = aiOverview.statusReport;
  const draftEvaluation = draftOverview.evaluation;

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
                <p className="eyebrow">Phase 6 Drafting Layer</p>
                <h2>
                  Customer Intelligence Workbench
                </h2>
                <p className="hero-copy">
                  The core pipeline now ingests local tickets, assigns the five
                  required personas, retrieves explainable evidence, and creates
                  guarded drafts only when the evidence is strong enough.
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
                        : "Core challenge workspace connected to local data and evidence metrics."}
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

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Phase 4 Evidence Layer</p>
                <h3>Knowledge retrieval quality</h3>
              </div>
              <span className="count-pill">
                {retrievalOverview.status === "ok" ? "Ready" : "Unavailable"}
              </span>
            </div>

            {retrievalEvaluation ? (
              <>
                <div className="diagnostic-grid">
                  <div>
                    <p className="diagnostic-value">
                      {retrievalEvaluation.answerable_with_evidence_count}
                    </p>
                    <p className="diagnostic-label">Answerable with evidence</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {retrievalEvaluation.known_unsupported_blocked_count}
                    </p>
                    <p className="diagnostic-label">Unsupported blocked</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {retrievalEvaluation.golden_query_pass_count}/
                      {retrievalEvaluation.golden_query_count}
                    </p>
                    <p className="diagnostic-label">Golden queries</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {retrievalEvaluation.conflict_warning_count}
                    </p>
                    <p className="diagnostic-label">Conflict warnings</p>
                  </div>
                </div>
                <div className="note-box">
                  Source-priority checks:
                  {" "}
                  {retrievalEvaluation.source_priority_checks_passed
                    ? "rate cards win for pricing and turnaround"
                    : "needs review"}
                  . Search methods:
                  {" "}
                  {retrievalEvaluation.search_methods.join(", ")}.
                </div>
              </>
            ) : (
              <p className="dataset-unavailable">
                Retrieval metrics will appear here when the backend is running.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Phase 5 AI Provider</p>
                <h3>GLM-5.1 structured contracts</h3>
              </div>
              <span className="count-pill">
                {aiOverview.status === "ok" ? "Ready" : "Unavailable"}
              </span>
            </div>

            {aiStatus ? (
              <>
                <div className="diagnostic-grid">
                  <div>
                    <p className="diagnostic-value">{aiStatus.model}</p>
                    <p className="diagnostic-label">Inference model</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {aiStatus.configured ? "Yes" : "No"}
                    </p>
                    <p className="diagnostic-label">API key configured</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {aiStatus.structured_schema_count}
                    </p>
                    <p className="diagnostic-label">JSON contracts</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {aiStatus.live_enabled ? "On" : "Off"}
                    </p>
                    <p className="diagnostic-label">Live inference</p>
                  </div>
                </div>
                <div className="note-box">
                  Provider:
                  {" "}
                  {aiStatus.provider}
                  . Prompt redaction:
                  {" "}
                  {aiStatus.prompt_redaction_enabled ? "enabled" : "disabled"}
                  . Base URL:
                  {" "}
                  {aiStatus.base_url}
                  .
                </div>
              </>
            ) : (
              <p className="dataset-unavailable">
                AI provider status will appear here when the backend is running.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Phase 6 Drafting Judge</p>
                <h3>Grounded reply generation</h3>
              </div>
              <span className="count-pill">
                {draftOverview.status === "ok" ? "Ready" : "Unavailable"}
              </span>
            </div>

            {draftEvaluation ? (
              <>
                <div className="diagnostic-grid">
                  <div>
                    <p className="diagnostic-value">
                      {draftEvaluation.customer_reply_count}
                    </p>
                    <p className="diagnostic-label">Customer drafts</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {draftEvaluation.holding_reply_count}
                    </p>
                    <p className="diagnostic-label">Holding replies</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {draftEvaluation.internal_note_count}
                    </p>
                    <p className="diagnostic-label">Internal notes</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {draftEvaluation.guardrail_failures_count}
                    </p>
                    <p className="diagnostic-label">Guardrail failures</p>
                  </div>
                </div>
                <div className="note-box">
                  Evidence-backed customer replies:
                  {" "}
                  {draftEvaluation.evidence_backed_customer_reply_count}
                  . Unsupported themes blocked:
                  {" "}
                  {draftEvaluation.blocked_unsupported_count}
                  . Approval queue:
                  {" "}
                  {draftEvaluation.approval_status_counts.needs_review ?? 0}
                  {" "}
                  needs review.
                </div>
              </>
            ) : (
              <p className="dataset-unavailable">
                Draft metrics will appear here when the backend is running.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
