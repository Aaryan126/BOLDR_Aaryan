"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  GapDetailResponse,
  GapListResponse,
  GapMetrics,
  GapMetricsResponse,
  KnowledgeGapRecord,
  TicketDetailResponse,
  TicketListResponse,
  TicketWorkflowDetail,
  TicketWorkflowSummary,
} from "@/lib/api";

type TicketFilter = "all" | "customer_reply" | "needs_review" | "gaps" | "order";

type WorkbenchClientProps = {
  initialTickets: TicketWorkflowSummary[];
  initialGaps: KnowledgeGapRecord[];
  initialGapMetrics: GapMetrics | null;
  initialTicketDetail: TicketWorkflowDetail | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const filterLabels: Array<{ label: string; value: TicketFilter }> = [
  { label: "All", value: "all" },
  { label: "Customer Drafts", value: "customer_reply" },
  { label: "Needs Review", value: "needs_review" },
  { label: "Gaps", value: "gaps" },
  { label: "Order Lookups", value: "order" },
];

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail ?? `Request failed with ${response.status}`;
    throw new Error(Array.isArray(detail) ? "Validation failed" : detail);
  }

  return (await response.json()) as T;
}

export function WorkbenchClient({
  initialTickets,
  initialGaps,
  initialGapMetrics,
  initialTicketDetail,
}: WorkbenchClientProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [gaps, setGaps] = useState(initialGaps);
  const [gapMetrics, setGapMetrics] = useState(initialGapMetrics);
  const [selectedTicketId, setSelectedTicketId] = useState(
    initialTicketDetail?.workflow.ticket_id ?? initialTickets[0]?.ticket_id ?? "",
  );
  const [selectedTicket, setSelectedTicket] = useState(initialTicketDetail);
  const [selectedGapId, setSelectedGapId] = useState(initialGaps[0]?.gap_id ?? "");
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [draftText, setDraftText] = useState(
    initialTicketDetail?.draft.draft.draft_reply ?? "",
  );
  const [reviewerNote, setReviewerNote] = useState("");
  const [gapResolution, setGapResolution] = useState("");
  const [gapReviewNote, setGapReviewNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const selectedGap = useMemo(
    () => gaps.find((gap) => gap.gap_id === selectedGapId) ?? gaps[0] ?? null,
    [gaps, selectedGapId],
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = ticketSearch.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesFilter =
        ticketFilter === "all" ||
        (ticketFilter === "customer_reply" && ticket.reply_type === "customer_reply") ||
        (ticketFilter === "needs_review" && ticket.approval_status === "needs_review") ||
        (ticketFilter === "gaps" && Boolean(ticket.gap_id)) ||
        (ticketFilter === "order" && ticket.answerability === "order_lookup_required");

      const matchesSearch =
        !normalizedSearch ||
        ticket.ticket_id.toLowerCase().includes(normalizedSearch) ||
        ticket.subject.toLowerCase().includes(normalizedSearch) ||
        ticket.persona.toLowerCase().includes(normalizedSearch) ||
        ticket.intent.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [ticketFilter, ticketSearch, tickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }

    let cancelled = false;
    async function loadTicket() {
      try {
        const body = await fetchJson<TicketDetailResponse>(
          `/api/tickets/${selectedTicketId}/intelligence`,
        );
        if (!cancelled) {
          setSelectedTicket(body.data);
          setDraftText(body.data.draft.approval.edited_reply ?? body.data.draft.draft.draft_reply);
          setReviewerNote(body.data.draft.approval.reviewer_note ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error instanceof Error ? error.message : "Ticket load failed.");
        }
      }
    }

    if (selectedTicket?.workflow.ticket_id !== selectedTicketId) {
      void loadTicket();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedTicketId, selectedTicket?.workflow.ticket_id]);

  useEffect(() => {
    setGapResolution(selectedGap?.human_resolution ?? "");
    setGapReviewNote(selectedGap?.kb_review_note ?? "");
  }, [selectedGap?.gap_id, selectedGap?.human_resolution, selectedGap?.kb_review_note]);

  async function refreshTickets(nextSelectedTicketId = selectedTicketId) {
    const body = await fetchJson<TicketListResponse>("/api/tickets");
    setTickets(body.data);
    if (nextSelectedTicketId) {
      const detail = await fetchJson<TicketDetailResponse>(
        `/api/tickets/${nextSelectedTicketId}/intelligence`,
      );
      setSelectedTicket(detail.data);
      setDraftText(detail.data.draft.approval.edited_reply ?? detail.data.draft.draft.draft_reply);
      setReviewerNote(detail.data.draft.approval.reviewer_note ?? "");
    }
  }

  async function refreshGaps(nextSelectedGapId = selectedGapId) {
    const [body, metricsBody] = await Promise.all([
      fetchJson<GapListResponse>("/api/gaps"),
      fetchJson<GapMetricsResponse>("/api/gaps/metrics"),
    ]);
    setGaps(body.data);
    setGapMetrics(metricsBody.data);
    const nextGap = body.data.find((gap) => gap.gap_id === nextSelectedGapId) ?? body.data[0];
    if (nextGap) {
      setSelectedGapId(nextGap.gap_id);
    }
  }

  async function runBatchProcess() {
    setLoadingAction("batch");
    setStatusMessage("");
    try {
      const body = await fetchJson<{
        meta: {
          processed_ticket_count: number;
          customer_reply_count: number;
          holding_reply_count: number;
          internal_note_count: number;
        };
      }>("/api/tickets/process-batch", {
        method: "POST",
        body: JSON.stringify({ limit: 70 }),
      });
      await refreshTickets();
      await refreshGaps();
      setStatusMessage(
        `Batch processed ${body.meta.processed_ticket_count} tickets: ${body.meta.customer_reply_count} drafts, ${body.meta.holding_reply_count} holds, ${body.meta.internal_note_count} internal notes.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Batch process failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function reviewDraft(status: "approved" | "edited_and_approved" | "rejected") {
    if (!selectedTicket) {
      return;
    }
    setLoadingAction(status);
    setStatusMessage("");
    try {
      await fetchJson(`/api/drafts/tickets/${selectedTicket.workflow.ticket_id}/review`, {
        method: "POST",
        body: JSON.stringify({
          status,
          reviewer_note: reviewerNote || null,
          edited_reply: status === "edited_and_approved" ? draftText : null,
        }),
      });
      await refreshTickets(selectedTicket.workflow.ticket_id);
      setStatusMessage(`Draft ${status.replaceAll("_", " ")} for ${selectedTicket.workflow.ticket_id}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Draft review failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function resolveGap() {
    if (!selectedGap) {
      return;
    }
    setLoadingAction("resolve-gap");
    setStatusMessage("");
    try {
      const body = await fetchJson<GapDetailResponse>(`/api/gaps/${selectedGap.gap_id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          human_resolution: gapResolution,
          reviewer_note: "Confirmed in workbench review.",
        }),
      });
      await refreshGaps(body.data.gap_id);
      setStatusMessage(`Gap resolved: ${body.data.gap_theme}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Gap resolution failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function draftGapKbEntry() {
    if (!selectedGap) {
      return;
    }
    setLoadingAction("draft-kb");
    setStatusMessage("");
    try {
      const body = await fetchJson<GapDetailResponse>(
        `/api/gaps/${selectedGap.gap_id}/draft-kb-entry`,
        {
          method: "POST",
        },
      );
      await refreshGaps(body.data.gap_id);
      setStatusMessage(`FAQ draft ready for ${body.data.gap_theme}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "FAQ draft failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function reviewGapKbDraft(status: "approved" | "rejected") {
    if (!selectedGap) {
      return;
    }
    setLoadingAction(`kb-${status}`);
    setStatusMessage("");
    try {
      const body = await fetchJson<GapDetailResponse>(
        `/api/gaps/${selectedGap.gap_id}/review-kb-entry`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            reviewer_note:
              gapReviewNote ||
              (status === "approved"
                ? "Approved in workbench review."
                : "Rejected in workbench review."),
          }),
        },
      );
      await refreshGaps(body.data.gap_id);
      setStatusMessage(`FAQ ${status} for ${body.data.gap_theme}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "FAQ review failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  const customerReplyCount = tickets.filter((ticket) => ticket.reply_type === "customer_reply").length;
  const needsReviewCount = tickets.filter((ticket) => ticket.approval_status === "needs_review").length;
  const gapTicketCount = tickets.filter((ticket) => Boolean(ticket.gap_id)).length;
  const orderLookupCount = tickets.filter(
    (ticket) => ticket.answerability === "order_lookup_required",
  ).length;
  const unresolvedGapCount =
    gapMetrics?.unresolved_gap_count ??
    gaps.filter((gap) => ["new", "needs_human_answer", "awaiting_supplier"].includes(gap.status))
      .length;
  const kbDraftReadyCount =
    gapMetrics?.kb_draft_ready_count ??
    gaps.filter((gap) => gap.status === "kb_draft_ready").length;
  const approvedGapCount =
    gapMetrics?.approved_count ?? gaps.filter((gap) => gap.status === "approved").length;
  const productPageUpdateCount =
    gapMetrics?.product_page_update_needed_count ??
    gaps.filter((gap) => gap.product_page_update_needed).length;

  return (
    <section className="workbench-console" data-testid="phase9-workbench">
      <div className="console-header">
        <div>
          <p className="eyebrow">Phase 9 KB Loop</p>
          <h3>Inbox Intelligence</h3>
        </div>
        <button
          className="primary-action"
          disabled={loadingAction === "batch"}
          onClick={runBatchProcess}
          type="button"
        >
          {loadingAction === "batch" ? "Processing" : "Run Batch"}
        </button>
      </div>

      <div className="workbench-stat-grid">
        <div>
          <strong>{tickets.length}</strong>
          <span>Tickets</span>
        </div>
        <div>
          <strong>{customerReplyCount}</strong>
          <span>Customer drafts</span>
        </div>
        <div>
          <strong>{needsReviewCount}</strong>
          <span>Review queue</span>
        </div>
        <div>
          <strong>{gapTicketCount}</strong>
          <span>Gap tickets</span>
        </div>
        <div>
          <strong>{orderLookupCount}</strong>
          <span>Order lookups</span>
        </div>
        <div>
          <strong>{unresolvedGapCount}</strong>
          <span>Open gaps</span>
        </div>
        <div>
          <strong>{kbDraftReadyCount}</strong>
          <span>FAQ drafts</span>
        </div>
        <div>
          <strong>{approvedGapCount}</strong>
          <span>Approved FAQs</span>
        </div>
        <div>
          <strong>{productPageUpdateCount}</strong>
          <span>Page updates</span>
        </div>
      </div>

      {statusMessage ? (
        <div className="status-strip" role="status">
          {statusMessage}
        </div>
      ) : null}

      <div className="workbench-columns">
        <section className="inbox-column" aria-label="Ticket list">
          <div className="control-row">
            <input
              aria-label="Search tickets"
              className="search-input"
              onChange={(event) => setTicketSearch(event.target.value)}
              placeholder="Search tickets"
              value={ticketSearch}
            />
          </div>

          <div className="segmented-control" aria-label="Ticket filters">
            {filterLabels.map((filter) => (
              <button
                className={ticketFilter === filter.value ? "segment-active" : ""}
                key={filter.value}
                onClick={() => setTicketFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="ticket-list">
            {filteredTickets.map((ticket) => (
              <button
                className={
                  selectedTicketId === ticket.ticket_id
                    ? "ticket-row ticket-row-active"
                    : "ticket-row"
                }
                data-testid={`ticket-${ticket.ticket_id}`}
                key={ticket.ticket_id}
                onClick={() => setSelectedTicketId(ticket.ticket_id)}
                type="button"
              >
                <span className="ticket-row-main">
                  <strong>{ticket.ticket_id}</strong>
                  <span>{ticket.subject}</span>
                </span>
                <span className="ticket-row-meta">
                  <span>{ticket.persona}</span>
                  <span>{ticket.reply_type.replaceAll("_", " ")}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="ticket-review-column" aria-label="Ticket review">
          {selectedTicket ? (
            <>
              <div className="review-heading">
                <div>
                  <p className="eyebrow">{selectedTicket.workflow.ticket_id}</p>
                  <h3>{selectedTicket.workflow.subject}</h3>
                </div>
                <span className={`status-pill status-${selectedTicket.draft.approval.status}`}>
                  {selectedTicket.draft.approval.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="chip-row">
                <span>{selectedTicket.workflow.persona}</span>
                <span>{selectedTicket.workflow.answerability.replaceAll("_", " ")}</span>
                <span>{selectedTicket.workflow.reply_type.replaceAll("_", " ")}</span>
                <span>{selectedTicket.workflow.evidence_count} evidence</span>
              </div>

              <div className="review-grid">
                <div className="review-block">
                  <p className="block-label">Customer Message</p>
                  <p>{selectedTicket.ticket.message_body}</p>
                </div>
                <div className="review-block">
                  <p className="block-label">Routing</p>
                  <p>{selectedTicket.classification.routing_reason}</p>
                  <div className="tag-row">
                    {selectedTicket.classification.operational_tags.map((tag) => (
                      <span key={tag}>{tag.replaceAll("_", " ")}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="draft-editor">
                <label htmlFor="draft-reply">Draft Reply</label>
                <textarea
                  id="draft-reply"
                  onChange={(event) => setDraftText(event.target.value)}
                  value={draftText}
                />
              </div>

              <div className="draft-editor draft-note">
                <label htmlFor="reviewer-note">Reviewer Note</label>
                <input
                  id="reviewer-note"
                  onChange={(event) => setReviewerNote(event.target.value)}
                  placeholder="Reviewer note"
                  value={reviewerNote}
                />
              </div>

              <div className="action-row">
                <button
                  className="secondary-action"
                  disabled={loadingAction !== null}
                  onClick={() => void reviewDraft("approved")}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="secondary-action"
                  disabled={loadingAction !== null}
                  onClick={() => void reviewDraft("edited_and_approved")}
                  type="button"
                >
                  Save Edit
                </button>
                <button
                  className="danger-action"
                  disabled={loadingAction !== null}
                  onClick={() => void reviewDraft("rejected")}
                  type="button"
                >
                  Reject
                </button>
              </div>

              <div className="evidence-layout">
                <section>
                  <div className="mini-heading">
                    <p className="eyebrow">Evidence</p>
                    <strong>{selectedTicket.retrieval.evidence.length}</strong>
                  </div>
                  <div className="evidence-list">
                    {selectedTicket.retrieval.evidence.slice(0, 5).map((evidence) => (
                      <article className="evidence-row" key={evidence.evidence_id}>
                        <div>
                          <strong>{evidence.source_file}</strong>
                          <span>{evidence.section_title}</span>
                        </div>
                        <p>{evidence.excerpt}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mini-heading">
                    <p className="eyebrow">Guardrails</p>
                    <strong>{selectedTicket.draft.guardrails.filter((item) => !item.passed).length}</strong>
                  </div>
                  <div className="guardrail-list">
                    {selectedTicket.draft.guardrails.map((guardrail) => (
                      <div className="guardrail-row" key={guardrail.name}>
                        <span>{guardrail.passed ? "Pass" : "Review"}</span>
                        <p>{guardrail.message}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <p className="dataset-unavailable">Ticket review is unavailable.</p>
          )}
        </section>
      </div>

      <section className="gap-workbench" aria-label="Knowledge gaps">
        <div className="console-header">
          <div>
            <p className="eyebrow">Knowledge Gaps</p>
            <h3>Resolution Queue</h3>
          </div>
          <span className="count-pill">{gaps.length} gaps</span>
        </div>

        <div className="gap-signal-grid">
          <div>
            <strong>{gapMetrics?.marketing_signal_count ?? 0}</strong>
            <span>Marketing signals</span>
          </div>
          <div>
            <strong>{productPageUpdateCount}</strong>
            <span>Product page updates</span>
          </div>
          <div>
            <strong>{kbDraftReadyCount}</strong>
            <span>FAQ drafts ready</span>
          </div>
          <div>
            <strong>{gapMetrics?.top_themes[0]?.gap_theme ?? "None"}</strong>
            <span>Top theme</span>
          </div>
        </div>

        <div className="gap-layout">
          <div className="gap-list">
            {gaps.map((gap) => (
              <button
                className={selectedGap?.gap_id === gap.gap_id ? "gap-row gap-row-active" : "gap-row"}
                key={gap.gap_id}
                onClick={() => setSelectedGapId(gap.gap_id)}
                type="button"
              >
                <span>
                  <strong>{gap.gap_theme}</strong>
                  <small>{gap.owner}</small>
                </span>
                <em>{gap.status.replaceAll("_", " ")}</em>
              </button>
            ))}
          </div>

          <div className="gap-detail">
            {selectedGap ? (
              <>
                <div className="review-heading">
                  <div>
                    <p className="eyebrow">{selectedGap.priority} priority</p>
                    <h3>{selectedGap.gap_theme}</h3>
                  </div>
                  <span className={`status-pill status-${selectedGap.status}`}>
                    {selectedGap.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="chip-row">
                  <span>{selectedGap.frequency} tickets</span>
                  <span>{selectedGap.suggested_faq_section}</span>
                  {selectedGap.marketing_signal ? <span>Marketing signal</span> : null}
                  {selectedGap.product_page_update_needed ? <span>Product page update</span> : null}
                </div>
                <div className="review-block">
                  <p className="block-label">Customer Wording</p>
                  <p>{selectedGap.gap_questions[0]}</p>
                </div>
                <div className="review-grid">
                  <div className="review-block">
                    <p className="block-label">Evidence Summary</p>
                    <p>{selectedGap.evidence_summary}</p>
                  </div>
                  <div className="review-block">
                    <p className="block-label">Next Action</p>
                    <p>{selectedGap.suggested_next_action}</p>
                  </div>
                </div>
                <div className="draft-editor">
                  <label htmlFor="gap-resolution">Verified Resolution</label>
                  <textarea
                    id="gap-resolution"
                    onChange={(event) => setGapResolution(event.target.value)}
                    value={gapResolution}
                  />
                </div>
                <div className="action-row">
                  <button
                    className="secondary-action"
                    disabled={loadingAction !== null || gapResolution.trim().length < 3}
                    onClick={resolveGap}
                    type="button"
                  >
                    Resolve Gap
                  </button>
                  <button
                    className="primary-action"
                    disabled={loadingAction !== null || !selectedGap.human_resolution}
                    onClick={draftGapKbEntry}
                    type="button"
                  >
                    Draft FAQ
                  </button>
                </div>
                {selectedGap.kb_draft ? (
                  <div className="kb-draft">
                    <p className="block-label">{selectedGap.kb_draft.faq_section}</p>
                    <strong>Q: {selectedGap.kb_draft.question}</strong>
                    <p>A: {selectedGap.kb_draft.answer}</p>
                    <div className="draft-editor draft-note">
                      <label htmlFor="gap-review-note">KB Review Note</label>
                      <input
                        id="gap-review-note"
                        onChange={(event) => setGapReviewNote(event.target.value)}
                        placeholder="KB review note"
                        value={gapReviewNote}
                      />
                    </div>
                    <div className="action-row">
                      <button
                        className="secondary-action"
                        disabled={loadingAction !== null}
                        onClick={() => void reviewGapKbDraft("approved")}
                        type="button"
                      >
                        Approve FAQ
                      </button>
                      <button
                        className="danger-action"
                        disabled={loadingAction !== null}
                        onClick={() => void reviewGapKbDraft("rejected")}
                        type="button"
                      >
                        Reject FAQ
                      </button>
                    </div>
                    {selectedGap.kb_review_note ? (
                      <div className="note-box">
                        {selectedGap.kb_review_note}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="dataset-unavailable">No gap selected.</p>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
