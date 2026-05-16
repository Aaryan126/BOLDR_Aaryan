"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type {
  BackendHealth,
  DraftOverview,
  GapMetrics,
  InsightsOverview,
  KnowledgeGapRecord,
  MarketingOpportunity,
  RetrievalOverview,
  ThemeRadarItem,
  TicketWorkflowDetail,
  TicketWorkflowSummary,
  WorkflowOverview,
} from "@/lib/api";

type DemoCaseKey = "answerable" | "gap";

type GuidedLoopDemoProps = {
  answerCaseDetail: TicketWorkflowDetail | null;
  draftOverview: DraftOverview;
  gapCaseDetail: TicketWorkflowDetail | null;
  health: BackendHealth;
  initialGapMetrics: GapMetrics | null;
  initialGaps: KnowledgeGapRecord[];
  initialTickets: TicketWorkflowSummary[];
  insightsOverview: InsightsOverview;
  retrievalOverview: RetrievalOverview;
  systemDetails: ReactNode;
  workflowOverview: WorkflowOverview;
};

type LoopStep = {
  id:
    | "email"
    | "intent"
    | "search"
    | "decision"
    | "draft"
    | "kb"
    | "marketing";
  label: string;
  shortLabel: string;
  description: string;
};

const loopSteps: LoopStep[] = [
  {
    id: "email",
    label: "Email received",
    shortLabel: "Email",
    description: "Capture the customer enquiry and preserve context.",
  },
  {
    id: "intent",
    label: "Extract intent",
    shortLabel: "Intent",
    description: "Identify persona, intent, routing needs, and extracted identifiers.",
  },
  {
    id: "search",
    label: "Search knowledge base",
    shortLabel: "Search",
    description: "Retrieve FAQ, SOP, rate-card, and product evidence.",
  },
  {
    id: "decision",
    label: "Answerable?",
    shortLabel: "Decision",
    description: "Choose the safe branch based on evidence sufficiency.",
  },
  {
    id: "draft",
    label: "Draft or flag",
    shortLabel: "Draft",
    description: "Draft a reply if supported, otherwise open a knowledge gap.",
  },
  {
    id: "kb",
    label: "Update KB",
    shortLabel: "KB",
    description: "After human resolution, prepare a reviewed FAQ entry.",
  },
  {
    id: "marketing",
    label: "Marketing intelligence",
    shortLabel: "Brief",
    description: "Turn repeated questions into persona and product-page signals.",
  },
];

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function metricValue(value: number | undefined | null, fallback = "0"): string {
  return typeof value === "number" ? String(value) : fallback;
}

function findLinkedGap(
  detail: TicketWorkflowDetail | null,
  gaps: KnowledgeGapRecord[],
): KnowledgeGapRecord | null {
  if (!detail) {
    return gaps[0] ?? null;
  }

  const ticketId = detail.workflow.ticket_id;
  const gapId = detail.workflow.gap_id;
  return (
    gaps.find((gap) => gap.gap_id === gapId) ??
    gaps.find((gap) => gap.source_ticket_ids.includes(ticketId)) ??
    gaps.find((gap) =>
      gap.gap_theme
        .toLowerCase()
        .includes(detail.workflow.intent.toLowerCase().slice(0, 8)),
    ) ??
    null
  );
}

export function GuidedLoopDemo({
  answerCaseDetail,
  draftOverview,
  gapCaseDetail,
  health,
  initialGapMetrics,
  initialGaps,
  initialTickets,
  insightsOverview,
  retrievalOverview,
  systemDetails,
  workflowOverview,
}: GuidedLoopDemoProps) {
  const [activeCaseKey, setActiveCaseKey] = useState<DemoCaseKey>("answerable");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [systemOpen, setSystemOpen] = useState(false);

  const answerFallback = useMemo(
    () =>
      answerCaseDetail ??
      (gapCaseDetail?.workflow.reply_type === "customer_reply" ? gapCaseDetail : null),
    [answerCaseDetail, gapCaseDetail],
  );
  const gapFallback = useMemo(
    () => gapCaseDetail ?? (answerCaseDetail?.workflow.gap_id ? answerCaseDetail : null),
    [answerCaseDetail, gapCaseDetail],
  );

  const selectedDetail = activeCaseKey === "answerable" ? answerFallback : gapFallback;
  const linkedGap = findLinkedGap(selectedDetail, initialGaps);
  const activeStep = loopSteps[activeStepIndex];
  const isAnswerableCase = activeCaseKey === "answerable";
  const canUseDemo = Boolean(selectedDetail);

  const selectedTheme = useMemo(() => {
    const ticketId = selectedDetail?.workflow.ticket_id;
    if (!ticketId || !insightsOverview.themeRadar?.data.length) {
      return insightsOverview.themeRadar?.data[0] ?? null;
    }
    return (
      insightsOverview.themeRadar.data.find((theme) =>
        theme.representative_ticket_ids.includes(ticketId),
      ) ??
      insightsOverview.themeRadar.data.find((theme) =>
        theme.evidence.some((item) => item.ticket_id === ticketId),
      ) ??
      insightsOverview.themeRadar.data[0]
    );
  }, [insightsOverview.themeRadar, selectedDetail?.workflow.ticket_id]);

  const selectedOpportunity = useMemo(() => {
    if (!insightsOverview.marketingBrief?.opportunities.length) {
      return null;
    }
    return (
      insightsOverview.marketingBrief.opportunities.find(
        (opportunity) => opportunity.theme_name === selectedTheme?.theme_name,
      ) ?? insightsOverview.marketingBrief.opportunities[0]
    );
  }, [insightsOverview.marketingBrief, selectedTheme?.theme_name]);
  const outputThemeName =
    !isAnswerableCase && linkedGap
      ? linkedGap.gap_theme
      : selectedTheme?.theme_name ?? linkedGap?.gap_theme ?? "Pending";
  const outputMarketingAction =
    !isAnswerableCase && linkedGap
      ? linkedGap.suggested_next_action
      : selectedOpportunity?.recommended_action ??
        linkedGap?.suggested_next_action ??
        "Review recurring customer language";

  const evidenceCards = selectedDetail?.retrieval.evidence.slice(0, 3) ?? [];
  const guardrails = selectedDetail?.draft.guardrails ?? [];
  const successfulGuardrails = guardrails.filter((guardrail) => guardrail.passed).length;
  const totalTickets = initialTickets.length;
  const workflowStatus = workflowOverview.statusReport;
  const retrievalStatus = retrievalOverview.evaluation;
  const draftStatus = draftOverview.evaluation;

  function chooseCase(nextCase: DemoCaseKey) {
    setActiveCaseKey(nextCase);
    setActiveStepIndex(0);
  }

  function goToPreviousStep() {
    setActiveStepIndex((current) => Math.max(0, current - 1));
  }

  function goToNextStep() {
    setActiveStepIndex((current) => Math.min(loopSteps.length - 1, current + 1));
  }

  return (
    <main className="guided-demo-shell">
      <header className="demo-topbar">
        <div className="demo-brand">
          <span>BOLDR</span>
          <strong>Revenue Rocket</strong>
        </div>
        <div className="demo-topbar-actions">
          <span className={health.status === "ok" ? "demo-health ok" : "demo-health bad"}>
            Backend: {health.status === "ok" ? "Connected" : "Unavailable"}
          </span>
          <button
            aria-expanded={systemOpen}
            className="system-details-button"
            onClick={() => setSystemOpen(true)}
            type="button"
          >
            System Details
          </button>
        </div>
      </header>

      <section className="demo-command-center" data-testid="guided-loop-demo">
        <div className="demo-intro">
          <p className="eyebrow">Guided Demo</p>
          <h1>Self-improving support intelligence, from email to marketing signal.</h1>
          <p>
            Walk a real BOLDR customer enquiry through the intelligence loop:
            classify, retrieve evidence, draft safely, flag gaps, update the KB,
            and expose recurring buyer signals.
          </p>
        </div>

        <div className="demo-metrics-row">
          <div>
            <strong>{metricValue(totalTickets)}</strong>
            <span>sample tickets</span>
          </div>
          <div>
            <strong>{metricValue(retrievalStatus?.answerable_with_evidence_count)}</strong>
            <span>evidence-backed</span>
          </div>
          <div>
            <strong>
              {metricValue(initialGapMetrics?.unresolved_gap_count ?? workflowStatus?.gap_count)}
            </strong>
            <span>open gaps</span>
          </div>
          <div>
            <strong>{metricValue(draftStatus?.customer_reply_count)}</strong>
            <span>draft replies</span>
          </div>
        </div>

        <div className="case-switcher" aria-label="Demo case selector">
          <button
            className={activeCaseKey === "answerable" ? "case-tab active" : "case-tab"}
            onClick={() => chooseCase("answerable")}
            type="button"
          >
            <span>Answerable enquiry</span>
            <strong>{answerFallback?.workflow.ticket_id ?? "No ticket"}</strong>
          </button>
          <button
            className={activeCaseKey === "gap" ? "case-tab active" : "case-tab"}
            onClick={() => chooseCase("gap")}
            type="button"
          >
            <span>Knowledge gap</span>
            <strong>{gapFallback?.workflow.ticket_id ?? "No ticket"}</strong>
          </button>
        </div>

        <div className="demo-workspace">
          <aside className="loop-rail" aria-label="Intelligence loop steps">
            {loopSteps.map((step, index) => (
              <button
                aria-current={index === activeStepIndex ? "step" : undefined}
                className={[
                  "loop-step",
                  index === activeStepIndex ? "active" : "",
                  index < activeStepIndex ? "complete" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={step.id}
                onClick={() => setActiveStepIndex(index)}
                type="button"
              >
                <span>{index + 1}</span>
                <strong>{step.label}</strong>
              </button>
            ))}
          </aside>

          <section className="demo-stage" aria-live="polite">
            <div className="stage-header">
              <div>
                <p className="eyebrow">{activeStep.shortLabel}</p>
                <h2>{activeStep.label}</h2>
                <p>{activeStep.description}</p>
              </div>
              <span className="stage-branch">
                {isAnswerableCase ? "Evidence-backed branch" : "Gap branch"}
              </span>
            </div>

            {!canUseDemo ? (
              <div className="empty-demo-state">
                <h3>Backend data is unavailable.</h3>
                <p>
                  Start the backend API to load real dataset tickets into the guided demo.
                </p>
              </div>
            ) : (
              <StageContent
                activeStep={activeStep}
                detail={selectedDetail}
                evidenceCards={evidenceCards}
                gap={linkedGap}
                isAnswerableCase={isAnswerableCase}
                opportunity={selectedOpportunity}
                theme={selectedTheme}
              />
            )}

            <div className="step-controls">
              <button
                className="secondary-action"
                disabled={activeStepIndex === 0}
                onClick={goToPreviousStep}
                type="button"
              >
                Back
              </button>
              <span>
                Step {activeStepIndex + 1} of {loopSteps.length}
              </span>
              <button
                className="primary-action"
                disabled={activeStepIndex === loopSteps.length - 1}
                onClick={goToNextStep}
                type="button"
              >
                Next
              </button>
            </div>
          </section>

          <aside className="ai-intelligence-panel">
            <div className="mini-heading">
              <p className="eyebrow">AI Intelligence</p>
              <strong>{selectedDetail?.workflow.ticket_id ?? "Offline"}</strong>
            </div>

            <div className="ai-summary-card">
              <span>Persona</span>
              <strong>{selectedDetail?.workflow.persona ?? "Waiting for ticket"}</strong>
              <p>{selectedDetail?.classification.persona_reasoning ?? "No classification loaded."}</p>
            </div>

            <div className="ai-signal-grid">
              <div>
                <span>Intent</span>
                <strong>{formatLabel(selectedDetail?.workflow.intent)}</strong>
              </div>
              <div>
                <span>Answerability</span>
                <strong>{formatLabel(selectedDetail?.workflow.answerability)}</strong>
              </div>
              <div>
                <span>Evidence</span>
                <strong>{selectedDetail?.workflow.evidence_count ?? 0} cards</strong>
              </div>
              <div>
                <span>Guardrails</span>
                <strong>
                  {successfulGuardrails}/{guardrails.length || 0} pass
                </strong>
              </div>
            </div>

            <div className="guardrail-list">
              {guardrails.slice(0, 4).map((guardrail) => (
                <div
                  className={guardrail.passed ? "guardrail-row pass" : "guardrail-row fail"}
                  key={guardrail.name}
                >
                  <span>{guardrail.passed ? "Pass" : "Review"}</span>
                  <p>{guardrail.message}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="demo-output-band">
          <div>
            <p className="eyebrow">Loop Output</p>
            <h3>
              {isAnswerableCase
                ? "A grounded reply is ready for human approval."
                : "A product knowledge gap becomes KB and marketing work."}
            </h3>
          </div>
          <div className="output-cards">
            <div>
              <span>Theme</span>
              <strong>{outputThemeName}</strong>
            </div>
            <div>
              <span>Marketing action</span>
              <strong>{outputMarketingAction}</strong>
            </div>
            <div>
              <span>Human gate</span>
              <strong>
                {isAnswerableCase ? "Approve before sending" : "Resolve before FAQ publish"}
              </strong>
            </div>
          </div>
        </section>
      </section>

      {systemOpen ? (
        <div className="system-drawer-backdrop" role="presentation">
          <aside
            aria-label="System details"
            aria-modal="true"
            className="system-drawer"
            role="dialog"
          >
            <div className="system-drawer-header">
              <div>
                <p className="eyebrow">Implementation Console</p>
                <h2>System Details</h2>
              </div>
              <button
                className="secondary-action"
                onClick={() => setSystemOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="system-drawer-body">{systemDetails}</div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

type StageContentProps = {
  activeStep: LoopStep;
  detail: TicketWorkflowDetail | null;
  evidenceCards: TicketWorkflowDetail["retrieval"]["evidence"];
  gap: KnowledgeGapRecord | null;
  isAnswerableCase: boolean;
  opportunity: MarketingOpportunity | null;
  theme: ThemeRadarItem | null;
};

function StageContent({
  activeStep,
  detail,
  evidenceCards,
  gap,
  isAnswerableCase,
  opportunity,
  theme,
}: StageContentProps) {
  if (!detail) {
    return null;
  }

  if (activeStep.id === "email") {
    return (
      <div className="email-stage-card">
        <div className="email-toolbar">
          <span>Incoming customer email</span>
          <strong>{detail.workflow.ticket_id}</strong>
        </div>
        <div className="email-meta-grid">
          <div>
            <span>From</span>
            <strong>{detail.ticket.customer_name}</strong>
            <p>{detail.ticket.customer_email}</p>
          </div>
          <div>
            <span>Received</span>
            <strong>{formatDate(detail.ticket.date_received)}</strong>
            <p>{detail.ticket.channel}</p>
          </div>
          <div>
            <span>Subject</span>
            <strong>{detail.ticket.subject}</strong>
            <p>{detail.ticket.order_id ?? "No order id"}</p>
          </div>
        </div>
        <blockquote>{detail.ticket.message_body}</blockquote>
      </div>
    );
  }

  if (activeStep.id === "intent") {
    return (
      <div className="stage-grid two">
        <article className="insight-card primary">
          <span>Buyer persona</span>
          <h3>{detail.classification.persona}</h3>
          <p>{detail.classification.persona_reasoning}</p>
          <div className="tag-row">
            {detail.classification.persona_trigger_terms.map((term) => (
              <span key={term}>{term}</span>
            ))}
          </div>
        </article>
        <article className="insight-card">
          <span>Intent and routing</span>
          <h3>{formatLabel(detail.classification.intent)}</h3>
          <p>{detail.classification.routing_reason}</p>
          <div className="tag-row">
            {detail.classification.operational_tags.map((tag) => (
              <span key={tag}>{formatLabel(tag)}</span>
            ))}
          </div>
        </article>
      </div>
    );
  }

  if (activeStep.id === "search") {
    return (
      <div className="evidence-stage">
        <div className="retrieval-status-card">
          <span>
            {detail.retrieval.sufficient_evidence
              ? "Evidence is sufficient"
              : "Evidence is not sufficient"}
          </span>
          <p>
            {detail.retrieval.insufficiency_reason ??
              detail.draft.evidence_sufficiency.rationale}
          </p>
        </div>
        <div className="demo-evidence-list">
          {evidenceCards.map((evidence) => (
            <article className="demo-evidence-card" key={evidence.evidence_id}>
              <div>
                <strong>{evidence.source_file}</strong>
                <span>{evidence.section_title}</span>
              </div>
              <p>{evidence.excerpt}</p>
              <small>
                Match: {evidence.match_type} | Confidence:{" "}
                {Math.round(evidence.confidence * 100)}%
              </small>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (activeStep.id === "decision") {
    return (
      <div className="decision-stage">
        <div className="decision-node">
          <span>In Knowledge Base?</span>
          <strong>{detail.draft.decision.evidence_sufficient ? "Yes" : "No"}</strong>
        </div>
        <div className="decision-branches">
          <article className={isAnswerableCase ? "branch-card active good" : "branch-card"}>
            <span>YES</span>
            <h3>Draft reply</h3>
            <p>Evidence supports the answer, but a human still approves before sending.</p>
          </article>
          <article className={!isAnswerableCase ? "branch-card active warning" : "branch-card"}>
            <span>NO</span>
            <h3>Flag knowledge gap</h3>
            <p>Unsupported claims are blocked and routed to the CS or product owner.</p>
          </article>
        </div>
      </div>
    );
  }

  if (activeStep.id === "draft") {
    if (!isAnswerableCase) {
      return (
        <div className="stage-grid two">
          <article className="gap-demo-card">
            <span>Knowledge gap</span>
            <h3>{gap?.gap_theme ?? detail.draft.gap_record?.gap_theme ?? "Gap detected"}</h3>
            <p>{gap?.evidence_summary ?? detail.draft.gap_record?.evidence_summary}</p>
            <div className="gap-meta-row">
              <strong>Owner: {gap?.owner ?? detail.draft.gap_record?.owner ?? "CS Lead"}</strong>
              <strong>
                Priority: {formatLabel(gap?.priority ?? detail.draft.gap_record?.priority)}
              </strong>
            </div>
          </article>
          <article className="insight-card">
            <span>Safe response</span>
            <h3>{formatLabel(detail.draft.draft.reply_type)}</h3>
            <p>{detail.draft.draft.draft_reply}</p>
          </article>
        </div>
      );
    }

    return (
      <div className="draft-stage-card">
        <div className="draft-header">
          <span>Draft reply queued for review</span>
          <strong>{formatLabel(detail.draft.approval.status)}</strong>
        </div>
        <pre>{detail.draft.draft.draft_reply}</pre>
        <div className="claim-list">
          {detail.draft.draft.claims.slice(0, 4).map((claim) => (
            <span key={claim}>{claim}</span>
          ))}
        </div>
      </div>
    );
  }

  if (activeStep.id === "kb") {
    return (
      <div className="stage-grid two">
        <article className="insight-card primary">
          <span>{isAnswerableCase ? "Knowledge base result" : "Human resolution gate"}</span>
          <h3>
            {isAnswerableCase
              ? "Existing KB was enough"
              : gap?.human_resolution
                ? "Resolution captured"
                : "Needs human answer"}
          </h3>
          <p>
            {isAnswerableCase
              ? "No new FAQ is published because the answer was already supported by source evidence."
              : gap?.human_resolution ??
                "The system will not auto-publish a new FAQ until a human supplies the verified answer."}
          </p>
        </article>
        <article className="faq-draft-card">
          <span>FAQ draft</span>
          <h3>{gap?.kb_draft?.question ?? gap?.suggested_faq_section ?? "Pending review"}</h3>
          <p>
            {gap?.kb_draft?.answer ??
              "After resolution, the system drafts a KB entry for one-click team review."}
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="stage-grid two">
      <article className="insight-card primary">
        <span>Theme cluster</span>
        <h3>{!isAnswerableCase && gap ? gap.gap_theme : theme?.theme_name ?? "Theme pending"}</h3>
        <p>
          {!isAnswerableCase && gap
            ? gap.evidence_summary
            : theme
            ? `${theme.frequency} tickets, ${theme.gap_count} gaps, trend ${theme.trend_direction}.`
            : "Theme clustering appears when the insights API is available."}
        </p>
        <div className="tag-row">
          {((!isAnswerableCase && gap ? gap.source_ticket_ids : theme?.representative_ticket_ids) ?? [
            detail.workflow.ticket_id,
          ])
            .slice(0, 5)
            .map((ticketId) => (
              <span key={ticketId}>{ticketId}</span>
            ))}
        </div>
      </article>
      <article className="insight-card marketing">
        <span>Marketing brief output</span>
        <h3>
          {!isAnswerableCase && gap
            ? "Product page and FAQ signal"
            : opportunity?.campaign_angle ?? "Product page signal"}
        </h3>
        <p>
          {(!isAnswerableCase && gap ? gap.suggested_next_action : opportunity?.insight) ??
            gap?.suggested_next_action ??
            "Show what customers ask that product pages do not answer clearly enough."}
        </p>
      </article>
    </div>
  );
}
