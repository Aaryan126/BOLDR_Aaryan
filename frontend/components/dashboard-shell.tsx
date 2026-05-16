import type {
  AIOverview,
  BackendHealth,
  ClassificationOverview,
  DatasetOverview,
  DraftOverview,
  ExternalBenchmarkOverview,
  GapMetrics,
  InsightsOverview,
  KnowledgeGapRecord,
  QualityOverview,
  RetrievalOverview,
  TicketWorkflowDetail,
  TicketWorkflowSummary,
  WorkflowOverview,
} from "@/lib/api";
import { ExternalBenchmarkClient } from "@/components/external-benchmark-client";
import { GuidedLoopDemo } from "@/components/guided-loop-demo";
import { InsightsClient } from "@/components/insights-client";
import { QualityPanel } from "@/components/quality-panel";
import { WorkbenchClient } from "@/components/workbench-client";

const navigationItems = [
  { label: "Core Loop", href: "#core-loop" },
  { label: "Personas", href: "#personas" },
  { label: "Demo Flow", href: "#demo-flow" },
  { label: "Workbench", href: "#workbench-console" },
  { label: "Theme Radar", href: "#theme-radar" },
  { label: "Quality", href: "#quality-dashboard" },
  { label: "External Bonus", href: "#external-benchmarking" },
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
    value: "Complete",
    tone: "blue",
  },
  {
    title: "Phase 12",
    label: "External sentiment benchmarking",
    value: "Active",
    tone: "purple",
  },
];

const coreLoopSteps = [
  {
    step: "1",
    action: "Ingest enquiry",
    detail: "Receive customer enquiry and extract intent, context, identifiers, and source channel.",
    output: "Local ticket inbox",
  },
  {
    step: "2",
    action: "Search Knowledge Base",
    detail: "Query FAQ, rate cards, SOP, and product reference for source-backed answers.",
    output: "Evidence trace",
  },
  {
    step: "3",
    action: "Answerable? Draft reply",
    detail: "If evidence is sufficient, draft a customer reply in BOLDR's voice and queue it for approval.",
    output: "Human review draft",
  },
  {
    step: "4",
    action: "Not answerable? Flag gap",
    detail: "If evidence is missing, create a knowledge gap and route it without hallucinating.",
    output: "Gap queue",
  },
  {
    step: "5",
    action: "Auto-draft Knowledge Base entry",
    detail: "After a human verifies the answer, draft a new FAQ entry for approval.",
    output: "FAQ draft",
  },
  {
    step: "6",
    action: "Theme clustering",
    detail: "Group weekly and monthly questions by theme, persona, answerability, and business signal.",
    output: "Theme Radar",
  },
  {
    step: "7",
    action: "Marketing brief",
    detail: "Produce a monthly brief on what customers ask that product pages do not answer well.",
    output: "Marketing intelligence",
  },
];

const personaCards = [
  {
    name: "Health-Conscious Buyer",
    tone: "green",
    triggers: "BPA-free, nickel-free, hypoallergenic, EU REACH, safe for kids",
    action: 'Product badge: "BPA-Free Straps"',
  },
  {
    name: "Gifter",
    tone: "gold",
    triggers: "Engraving, gift wrap, birthday, anniversary, turnaround time",
    action: "Seasonal campaigns: Valentines, Fathers Day",
  },
  {
    name: "Enthusiast / Collector",
    tone: "navy",
    triggers: "Grade 5 titanium, Miyota movement, limited editions",
    action: "Collector content: specs & craftsmanship",
  },
  {
    name: "Active / Outdoor Buyer",
    tone: "blue",
    triggers: "Water resistance, shock, trail running, FKM rubber strap",
    action: "Segment: adventure lifestyle content",
  },
  {
    name: "Sustainability Advocate",
    tone: "purple",
    triggers: "Vegan straps, carbon offset shipping, eco packaging",
    action: "New: vegan strap angle to develop",
  },
];

const demoFlow = [
  {
    label: "Pick a ticket",
    body: "Start in Inbox Intelligence with a concrete enquiry such as TKT-1048 or a sustainability gap ticket.",
  },
  {
    label: "Inspect the intelligence",
    body: "Show persona, intent, answerability, routing reason, evidence cards, and guardrails.",
  },
  {
    label: "Approve or route",
    body: "Approve an answerable draft, or resolve a gap and generate a reviewed FAQ draft.",
  },
  {
    label: "Show business output",
    body: "Move to Theme Radar, Marketing Brief, Quality Dashboard, and the external benchmark bonus.",
  },
];

type DashboardShellProps = {
  answerCaseDetail: TicketWorkflowDetail | null;
  gapCaseDetail: TicketWorkflowDetail | null;
  health: BackendHealth;
  datasetOverview: DatasetOverview;
  classificationOverview: ClassificationOverview;
  retrievalOverview: RetrievalOverview;
  aiOverview: AIOverview;
  draftOverview: DraftOverview;
  workflowOverview: WorkflowOverview;
  insightsOverview: InsightsOverview;
  qualityOverview: QualityOverview;
  externalBenchmarkOverview: ExternalBenchmarkOverview;
  initialTickets: TicketWorkflowSummary[];
  initialGaps: KnowledgeGapRecord[];
  initialGapMetrics: GapMetrics | null;
  initialTicketDetail: TicketWorkflowDetail | null;
};

export function DashboardShell({
  answerCaseDetail,
  gapCaseDetail,
  health,
  datasetOverview,
  classificationOverview,
  retrievalOverview,
  aiOverview,
  draftOverview,
  workflowOverview,
  insightsOverview,
  qualityOverview,
  externalBenchmarkOverview,
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
  const themeRadar = insightsOverview.themeRadar;
  const marketingBrief = insightsOverview.marketingBrief;

  const coreStepOutputs: Record<string, string> = {
    "1": diagnostics ? `${diagnostics.ticket_count} tickets parsed` : "Waiting for backend",
    "2": retrievalEvaluation
      ? `${retrievalEvaluation.answerable_with_evidence_count} answerable tickets with evidence`
      : "Waiting for retrieval",
    "3": draftEvaluation
      ? `${draftEvaluation.customer_reply_count} customer drafts`
      : "Waiting for drafts",
    "4": workflowStatus
      ? `${workflowStatus.gap_count} gaps, ${workflowStatus.unresolved_gap_count} unresolved`
      : "Waiting for gaps",
    "5": workflowStatus
      ? `${workflowStatus.kb_draft_ready_count} ready, ${workflowStatus.approved_gap_count} approved`
      : "Waiting for KB drafts",
    "6": themeRadar
      ? `${themeRadar.meta.theme_count} themes from ${themeRadar.meta.clustered_ticket_count} tickets`
      : "Waiting for themes",
    "7": marketingBrief
      ? `${marketingBrief.opportunities.length} opportunities`
      : "Waiting for brief",
  };

  const systemDetails = (
    <div className="workbench system-workbench">
      <div className="workbench-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <p className="eyebrow">BOLDR</p>
            <h1>Revenue Rocket</h1>
          </div>
          <nav className="sidebar-nav" aria-label="Workbench navigation">
            {navigationItems.map((item, index) => (
              <a
                href={item.href}
                key={item.label}
                className={index === 0 ? "nav-link nav-link-active" : "nav-link"}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <section className="content">
          <header
            className="hero-panel challenge-hero"
            data-testid="core-demo-page"
            id="core-loop"
          >
            <div className="hero-content">
              <div>
                <p className="eyebrow">Core Challenge</p>
                <h2>
                  The Intelligence Loop
                </h2>
                <p className="hero-copy">
                  A live demo path for BOLDR support: ingest an enquiry, find
                  source-backed answers, draft only when evidence exists, flag
                  gaps, turn resolved gaps into FAQ drafts, and surface recurring
                  questions as marketing intelligence.
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

          <section className="panel core-loop-panel" aria-labelledby="core-loop-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Demo Backbone</p>
                <h3 id="core-loop-heading">Core Challenge: The Intelligence Loop</h3>
              </div>
              <span className="count-pill">7 steps</span>
            </div>
            <div className="core-loop-table-wrap">
              <table className="core-loop-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Action</th>
                    <th>Detail</th>
                    <th>Live output</th>
                  </tr>
                </thead>
                <tbody>
                  {coreLoopSteps.map((step) => (
                    <tr key={step.step}>
                      <td data-label="Step">{step.step}</td>
                      <td data-label="Action">
                        <strong>{step.action}</strong>
                      </td>
                      <td data-label="Detail">{step.detail}</td>
                      <td data-label="Live output">
                        <span className="core-output-pill">
                          {coreStepOutputs[step.step] ?? step.output}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel persona-demo-panel" id="personas">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Required Persona Tags</p>
                <h3>Buyer Personas to Identify</h3>
              </div>
              <span className="count-pill">Exact challenge set</span>
            </div>
            <p className="section-copy">
              The workflow tags every enquiry against one of these five
              challenge personas. The tag then informs routing, draft tone, gap
              grouping, and marketing output.
            </p>
            <div className="persona-demo-grid">
              {personaCards.map((persona) => (
                <article
                  className={`persona-demo-card persona-tone-${persona.tone}`}
                  key={persona.name}
                >
                  <h4>{persona.name}</h4>
                  <p>{persona.triggers}</p>
                  <strong>{persona.action}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="panel demo-flow-panel" id="demo-flow">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Presentation Flow</p>
                <h3>How to demo the system</h3>
              </div>
              <span className="count-pill">Core first, bonus last</span>
            </div>
            <div className="demo-flow-grid">
              {demoFlow.map((step, index) => (
                <article className="demo-flow-card" key={step.label}>
                  <span>{index + 1}</span>
                  <h4>{step.label}</h4>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          <div id="workbench-console">
            <WorkbenchClient
              initialGaps={initialGaps}
              initialGapMetrics={initialGapMetrics}
              initialTicketDetail={initialTicketDetail}
              initialTickets={initialTickets}
            />
          </div>

          <div id="theme-radar">
            <InsightsClient
              initialMarketingBrief={insightsOverview.marketingBrief}
              initialThemeRadar={insightsOverview.themeRadar}
            />
          </div>

          <div id="quality-dashboard">
            <QualityPanel scorecard={qualityOverview.scorecard} />
          </div>

          <div id="external-benchmarking">
            <ExternalBenchmarkClient
              initialBenchmarks={externalBenchmarkOverview.benchmarks}
              initialSources={externalBenchmarkOverview.sources}
            />
          </div>

          <section className="panel build-progress-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Build Progress</p>
                <h3>Implementation status</h3>
              </div>
              <span className="count-pill">{phaseCards.length} phases</span>
            </div>
            <div className="phase-strip">
              {phaseCards.map((card) => (
                <article key={card.title} className="metric-card">
                  <div className={`tone-bar tone-${card.tone}`} />
                  <p className="card-kicker">{card.title}</p>
                  <h3>{card.value}</h3>
                  <p>{card.label}</p>
                </article>
              ))}
            </div>
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
    </div>
  );

  return (
    <GuidedLoopDemo
      answerCaseDetail={answerCaseDetail}
      draftOverview={draftOverview}
      gapCaseDetail={gapCaseDetail}
      health={health}
      initialGapMetrics={initialGapMetrics}
      initialGaps={initialGaps}
      initialTickets={initialTickets}
      insightsOverview={insightsOverview}
      retrievalOverview={retrievalOverview}
      systemDetails={systemDetails}
      workflowOverview={workflowOverview}
    />
  );
}
