import type {
  AIOverview,
  BackendHealth,
  ClassificationOverview,
  DatasetOverview,
  DraftOverview,
  GapMetrics,
  InsightsOverview,
  KnowledgeGapRecord,
  QualityOverview,
  RetrievalOverview,
  TicketWorkflowDetail,
  TicketWorkflowSummary,
  WorkflowOverview,
} from "@/lib/api";
import { InsightsClient } from "@/components/insights-client";
import { QualityPanel } from "@/components/quality-panel";
import { WorkbenchClient } from "@/components/workbench-client";

const navigationItems = [
  "Inbox Intelligence",
  "Ticket Review",
  "Knowledge Gaps",
  "Theme Radar",
  "Marketing Brief",
  "Quality Dashboard",
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
    value: "Complete",
    tone: "gold",
  },
  {
    title: "Phase 7",
    label: "Stable ticket, batch, and gap workflow APIs",
    value: "Complete",
    tone: "gold",
  },
  {
    title: "Phase 8",
    label: "Interactive ticket review and gap workbench",
    value: "Complete",
    tone: "gold",
  },
  {
    title: "Phase 9",
    label: "Knowledge gap metrics and FAQ review loop",
    value: "Complete",
    tone: "green",
  },
  {
    title: "Phase 10",
    label: "Theme radar and monthly marketing brief",
    value: "Complete",
    tone: "purple",
  },
  {
    title: "Phase 11",
    label: "Evaluation and quality scorecard",
    value: "Active",
    tone: "blue",
  },
];

const upcomingModules = [
  {
    title: "Phase 12",
    body: "Implement bonus external sentiment benchmarking.",
  },
];

type DashboardShellProps = {
  health: BackendHealth;
  datasetOverview: DatasetOverview;
  classificationOverview: ClassificationOverview;
  retrievalOverview: RetrievalOverview;
  aiOverview: AIOverview;
  draftOverview: DraftOverview;
  workflowOverview: WorkflowOverview;
  insightsOverview: InsightsOverview;
  qualityOverview: QualityOverview;
  initialTickets: TicketWorkflowSummary[];
  initialGaps: KnowledgeGapRecord[];
  initialGapMetrics: GapMetrics | null;
  initialTicketDetail: TicketWorkflowDetail | null;
};

export function DashboardShell({
  health,
  datasetOverview,
  classificationOverview,
  retrievalOverview,
  aiOverview,
  draftOverview,
  workflowOverview,
  insightsOverview,
  qualityOverview,
  initialTickets,
  initialGaps,
  initialGapMetrics,
  initialTicketDetail,
}: DashboardShellProps) {
  const isHealthy = health.status === "ok";
  const diagnostics = datasetOverview.diagnostics;
  const evaluation = classificationOverview.evaluation;
  const retrievalEvaluation = retrievalOverview.evaluation;
  const aiStatus = aiOverview.statusReport;
  const draftEvaluation = draftOverview.evaluation;
  const workflowStatus = workflowOverview.statusReport;

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
                <p className="eyebrow">Phase 11 Quality Dashboard</p>
                <h2>
                  Customer Intelligence Workbench
                </h2>
                <p className="hero-copy">
                  The core pipeline now ingests local tickets, assigns the five
                  required personas, retrieves explainable evidence, and creates
                  guarded drafts, KB improvements, marketing intelligence, and demo-ready quality metrics.
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
                  {navigationItems.length} areas
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
                        : item === "Quality Dashboard"
                          ? "Evaluation scorecard for accuracy, evidence, guardrails, and golden fixtures."
                        : "Core challenge workspace connected to local data and evidence metrics."}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <p className="eyebrow">Next Build Steps</p>
              <h3>Review before intelligence reports</h3>
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

          <WorkbenchClient
            initialGaps={initialGaps}
            initialGapMetrics={initialGapMetrics}
            initialTicketDetail={initialTicketDetail}
            initialTickets={initialTickets}
          />

          <InsightsClient
            initialMarketingBrief={insightsOverview.marketingBrief}
            initialThemeRadar={insightsOverview.themeRadar}
          />

          <QualityPanel scorecard={qualityOverview.scorecard} />

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

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Phase 7 Workflow API</p>
                <h3>Stable review endpoints</h3>
              </div>
              <span className="count-pill">
                {workflowOverview.status === "ok" ? "Ready" : "Unavailable"}
              </span>
            </div>

            {workflowStatus ? (
              <>
                <div className="diagnostic-grid">
                  <div>
                    <p className="diagnostic-value">
                      {workflowStatus.stable_endpoint_count}
                    </p>
                    <p className="diagnostic-label">Stable endpoints</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {workflowStatus.ticket_count}
                    </p>
                    <p className="diagnostic-label">Tickets routable</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {workflowStatus.gap_count}
                    </p>
                    <p className="diagnostic-label">Gap records</p>
                  </div>
                  <div>
                    <p className="diagnostic-value">
                      {workflowStatus.approval_queue_count}
                    </p>
                    <p className="diagnostic-label">Review queue</p>
                  </div>
                </div>
                <div className="note-box">
                  Batch runs this session:
                  {" "}
                  {workflowStatus.process_run_count}
                  . Unresolved gaps:
                  {" "}
                  {workflowStatus.unresolved_gap_count}
                  . KB drafts ready:
                  {" "}
                  {workflowStatus.kb_draft_ready_count}
                  . Actions:
                  {" "}
                  {workflowStatus.supported_review_actions.join(", ")}.
                </div>
              </>
            ) : (
              <p className="dataset-unavailable">
                Workflow API readiness will appear here when the backend is running.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
