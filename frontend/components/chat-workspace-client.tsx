"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resetDemoEnquiries } from "@/lib/api";
import { getConfiguredApiBaseUrl } from "@/lib/api";
import type {
  AdhocEnquiryRecord,
  DatasetOverview,
  ExternalBenchmark,
  ExternalBenchmarkOverview,
  GapMetrics,
  InsightsOverview,
  KnowledgeGapRecord,
  ThemeRadarItem,
  TicketWorkflowSummary,
  TraceEvent,
  WorkflowOverview,
} from "@/lib/api";

type WorkspaceTab =
  | "chat"
  | "approvals"
  | "cs"
  | "kb"
  | "marketing"
  | "system";
type WorkspaceTheme = "dark" | "light";

type ChatWorkspaceClientProps = {
  datasetOverview: DatasetOverview;
  initialTickets: TicketWorkflowSummary[];
  initialGaps: KnowledgeGapRecord[];
  initialGapMetrics: GapMetrics | null;
  insightsOverview: InsightsOverview;
  externalBenchmarkOverview: ExternalBenchmarkOverview;
  workflowOverview: WorkflowOverview;
  systemDetails: ReactNode;
  isHealthy: boolean;
};

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "chat", label: "Customer Chat" },
  { id: "approvals", label: "Approvals" },
  { id: "cs", label: "CS Queue" },
  { id: "kb", label: "Knowledge Base" },
  { id: "marketing", label: "Marketing Intel" },
];

const themeStorageKey = "boldr-ui-theme-v1";

const requiredPersonas = [
  "Health-Conscious Buyer",
  "Gifter",
  "Enthusiast / Collector",
  "Active / Outdoor Buyer",
  "Sustainability Advocate",
];

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
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

function getApiBaseUrl() {
  const baseUrl = getConfiguredApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Backend API URL is not configured.");
  }
  return baseUrl;
}

function formatLabel(value: string | null | undefined) {
  return (value ?? "unknown").replaceAll("_", " ");
}

function badgeToneClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("approved") || normalized.includes("connected") || normalized === "completed") {
    return "tone-success";
  }
  if (normalized.includes("reject") || normalized.includes("offline") || normalized.includes("blocked")) {
    return "tone-danger";
  }
  if (
    normalized.includes("awaiting") ||
    normalized.includes("needs") ||
    normalized.includes("draft") ||
    normalized.includes("priority")
  ) {
    return "tone-warning";
  }
  if (normalized.includes("health-conscious")) {
    return "tone-health";
  }
  if (normalized.includes("gifter")) {
    return "tone-gifter";
  }
  if (normalized.includes("collector") || normalized.includes("enthusiast")) {
    return "tone-collector";
  }
  if (normalized.includes("outdoor") || normalized.includes("active")) {
    return "tone-outdoor";
  }
  if (normalized.includes("sustainability")) {
    return "tone-sustainability";
  }
  if (
    normalized.includes("product-page") ||
    normalized.includes("marketing") ||
    normalized.includes("evidence") ||
    normalized.includes("materials") ||
    normalized.includes("engraving") ||
    normalized.includes("servicing")
  ) {
    return "tone-accent";
  }
  return "tone-neutral";
}

function dominantPersonaFromBreakdown(breakdown: ThemeRadarItem["persona_breakdown"]) {
  const [persona] =
    Object.entries(breakdown)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])[0] ?? [];
  return persona ?? "Marketing signal";
}

const priorityBenchmarkKeys = [
  "materials_safety",
  "strap_outdoor_safety",
  "sustainability",
];

function benchmarkPriority(benchmark: ExternalBenchmark) {
  const index = priorityBenchmarkKeys.indexOf(benchmark.theme_key);
  return index === -1 ? priorityBenchmarkKeys.length : index;
}

function formatBenchmarkClassification(value: ExternalBenchmark["classification"]) {
  const labels: Record<ExternalBenchmark["classification"], string> = {
    boldr_specific_gap: "BOLDR-specific gap",
    market_wide_signal: "Market-wide signal",
    market_wide_concern_with_boldr_gap: "Market-wide concern + BOLDR gap",
    covered_but_under_merchandised: "Covered, under-merchandised",
  };
  return labels[value];
}

function benchmarkToneClass(benchmark: ExternalBenchmark) {
  if (benchmark.classification.includes("gap")) {
    return "tone-warning";
  }
  if (benchmark.classification.includes("market_wide")) {
    return "tone-accent";
  }
  if (benchmark.classification.includes("covered")) {
    return "tone-success";
  }
  return "tone-neutral";
}

function samplePriority(ticket: TicketWorkflowSummary) {
  const text = `${ticket.ticket_id} ${ticket.subject} ${ticket.intent} ${ticket.persona}`.toLowerCase();
  const patterns = [
    /bpa|safe|hypoallergenic/,
    /vegan|sustain|carbon|eco/,
    /engraving|engrave/,
    /service|regulation|battery/,
    /strap|lug|nato|quick-release/,
    /order|tracking|refund/,
  ];
  const index = patterns.findIndex((pattern) => pattern.test(text));
  return index === -1 ? patterns.length : index;
}

function sampleComposerText(ticket: TicketWorkflowSummary) {
  return ticket.subject.trim();
}

function upsertRecord(records: AdhocEnquiryRecord[], next: AdhocEnquiryRecord) {
  const existing = records.some((record) => record.enquiry_id === next.enquiry_id);
  if (!existing) {
    return [...records, next];
  }
  return records.map((record) => (record.enquiry_id === next.enquiry_id ? next : record));
}

export function ChatWorkspaceClient({
  datasetOverview,
  initialTickets,
  initialGaps,
  initialGapMetrics,
  insightsOverview,
  externalBenchmarkOverview,
  workflowOverview,
  systemDetails,
  isHealthy,
}: ChatWorkspaceClientProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");
  const [theme, setTheme] = useState<WorkspaceTheme>("dark");
  const [enquiries, setEnquiries] = useState<AdhocEnquiryRecord[]>([]);
  const [composer, setComposer] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedApprovalId, setSelectedApprovalId] = useState("");
  const [selectedGapId, setSelectedGapId] = useState("");
  const [approvalDraft, setApprovalDraft] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [gapResolution, setGapResolution] = useState("");
  const [gapNote, setGapNote] = useState("");
  const [kbReviewNote, setKbReviewNote] = useState("");
  const messageStreamRef = useRef<HTMLDivElement | null>(null);

  const sampleOptions = useMemo(
    () =>
      [...initialTickets]
        .sort((a, b) => samplePriority(a) - samplePriority(b) || a.ticket_id.localeCompare(b.ticket_id))
        .slice(0, 10),
    [initialTickets],
  );

  const approvalQueue = useMemo(
    () =>
      enquiries.filter(
        (record) =>
          record.draft.decision.reply_type === "customer_reply" &&
          record.state === "awaiting_approval",
      ),
    [enquiries],
  );

  const gapQueue = useMemo(
    () => enquiries.filter((record) => Boolean(record.gap_state)),
    [enquiries],
  );

  const selectedApproval =
    approvalQueue.find((record) => record.enquiry_id === selectedApprovalId) ??
    approvalQueue[0] ??
    null;
  const selectedGap =
    gapQueue.find((record) => record.enquiry_id === selectedGapId) ?? gapQueue[0] ?? null;

  const diagnostics = datasetOverview.diagnostics;
  const workflowStatus = workflowOverview.statusReport;
  const themeRadar = insightsOverview.themeRadar;
  const marketingBrief = insightsOverview.marketingBrief;

  const livePersonaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    enquiries.forEach((record) => {
      counts[record.classification.persona] =
        (counts[record.classification.persona] ?? 0) + 1;
    });
    return counts;
  }, [enquiries]);

  const liveGapThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    gapQueue.forEach((record) => {
      const theme = record.gap_state?.gap_theme ?? "Unclassified gap";
      counts[theme] = (counts[theme] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [gapQueue]);

  const approvedKbAdditions = gapQueue.filter(
    (record) => record.gap_state?.status === "approved" && record.gap_state.kb_draft,
  );
  const pendingKbDrafts = gapQueue.filter(
    (record) =>
      record.gap_state?.status === "kb_draft_ready" ||
      record.gap_state?.status === "resolved_needs_kb_draft" ||
      record.gap_state?.status === "needs_resolution",
  );
  const productPageSignals = gapQueue.filter(
    (record) => record.gap_state?.product_page_update_needed,
  );
  const themeClusters = themeRadar?.data ?? [];
  const marketingOpportunities = marketingBrief?.opportunities ?? [];
  const productPageOpportunities = marketingOpportunities.filter(
    (opportunity) => opportunity.product_page_update_needed,
  );
  const monthlyBriefOpportunities =
    productPageOpportunities.length > 0
      ? productPageOpportunities.slice(0, 4)
      : marketingOpportunities.slice(0, 4);
  const weeklyThemeClusters = themeClusters.slice(0, 6);
  const externalBenchmarks = externalBenchmarkOverview.benchmarks;
  const externalSources = externalBenchmarkOverview.sources;
  const externalSourceTypes = new Set(externalSources.map((source) => source.source_type));
  const marketWideBenchmarkCount = externalBenchmarks.filter((benchmark) =>
    benchmark.classification.includes("market_wide"),
  ).length;
  const externalSourceUrlCount = externalBenchmarks.reduce(
    (total, benchmark) => total + benchmark.source_urls.length,
    0,
  );
  const visibleExternalBenchmarks = [...externalBenchmarks]
    .sort((left, right) => benchmarkPriority(left) - benchmarkPriority(right))
    .slice(0, 3);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const stream = messageStreamRef.current;
    if (!stream) {
      return;
    }
    stream.scrollTo({
      top: stream.scrollHeight,
      behavior,
    });
  }, []);

  function startNewConversation() {
    clearLocalDemoState();
    setStatusMessage("");
    requestAnimationFrame(() => scrollMessagesToBottom("auto"));
  }

  function clearLocalDemoState() {
    setEnquiries([]);
    setComposer("");
    setPendingMessage("");
    setSelectedSampleId("");
    setSelectedApprovalId("");
    setSelectedGapId("");
    setApprovalDraft("");
    setApprovalNote("");
    setGapResolution("");
    setGapNote("");
    setKbReviewNote("");
  }

  function handleSampleChange(ticketId: string) {
    setSelectedSampleId(ticketId);
    const selectedSample = sampleOptions.find((sample) => sample.ticket_id === ticketId);
    setComposer(selectedSample ? sampleComposerText(selectedSample) : "");
    requestAnimationFrame(() => scrollMessagesToBottom());
  }

  async function resetDemo() {
    setLoadingAction("reset-demo");
    setStatusMessage("");
    try {
      const result = await resetDemoEnquiries();
      clearLocalDemoState();
      setActiveTab("chat");
      setStatusMessage(
        `Demo reset. Cleared ${result.cleared_count} enquiries; next ID ${result.next_enquiry_id}.`,
      );
      requestAnimationFrame(() => scrollMessagesToBottom("auto"));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Demo reset failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (activeTab !== "chat") {
      return;
    }
    const frame = requestAnimationFrame(() => scrollMessagesToBottom());
    return () => cancelAnimationFrame(frame);
  }, [activeTab, enquiries, scrollMessagesToBottom]);

  useEffect(() => {
    let cancelled = false;

    async function loadEnquiries() {
      try {
        const data = await fetchJson<AdhocEnquiryRecord[]>("/api/enquiries");
        if (!cancelled) {
          setEnquiries(data);
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(
            error instanceof Error ? error.message : "Could not load demo enquiries.",
          );
        }
      }
    }

    void loadEnquiries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedApproval && approvalQueue[0]) {
      setSelectedApprovalId(approvalQueue[0].enquiry_id);
    }
  }, [approvalQueue, selectedApproval]);

  useEffect(() => {
    if (!selectedGap && gapQueue[0]) {
      setSelectedGapId(gapQueue[0].enquiry_id);
    }
  }, [gapQueue, selectedGap]);

  useEffect(() => {
    if (!selectedApproval) {
      setApprovalDraft("");
      setApprovalNote("");
      return;
    }
    setApprovalDraft(
      selectedApproval.approval_state.edited_reply ??
        selectedApproval.draft.draft.draft_reply,
    );
    setApprovalNote(selectedApproval.approval_state.reviewer_note ?? "");
  }, [selectedApproval?.enquiry_id, selectedApproval]);

  useEffect(() => {
    if (!selectedGap?.gap_state) {
      setGapResolution("");
      setGapNote("");
      setKbReviewNote("");
      return;
    }
    setGapResolution(selectedGap.gap_state.human_resolution ?? "");
    setGapNote(selectedGap.gap_state.reviewer_note ?? "");
    setKbReviewNote(selectedGap.gap_state.kb_review_note ?? "");
  }, [selectedGap?.enquiry_id, selectedGap]);

  async function submitEnquiry() {
    if (loadingAction === "submit") {
      return;
    }
    const selectedSample = sampleOptions.find(
      (sample) => sample.ticket_id === selectedSampleId,
    );
    const message = composer.trim() || (selectedSample ? sampleComposerText(selectedSample) : "");
    if (!message.trim()) {
      setStatusMessage("Enter a customer question or choose a sample enquiry.");
      return;
    }

    setLoadingAction("submit");
    setPendingMessage(message);
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>("/api/enquiries", {
        method: "POST",
        body: JSON.stringify({
          message,
          customer_name: "Demo Customer",
          customer_email: "demo.customer@example.com",
          source: selectedSample ? "sample_dropdown" : "judge_chat",
          sample_ticket_id: selectedSample?.ticket_id ?? null,
        }),
      });
      setEnquiries((current) => upsertRecord(current, record));
      if (record.draft.decision.reply_type === "customer_reply") {
        setSelectedApprovalId(record.enquiry_id);
      }
      if (record.gap_state) {
        setSelectedGapId(record.enquiry_id);
      }
      setComposer("");
      setSelectedSampleId("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Enquiry failed.");
    } finally {
      setPendingMessage("");
      setLoadingAction(null);
    }
  }

  async function reviewAnswer(status: "approved" | "edited_and_approved" | "rejected") {
    if (!selectedApproval) {
      return;
    }
    setLoadingAction(status);
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedApproval.enquiry_id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            edited_reply: status === "edited_and_approved" ? approvalDraft : null,
            reviewer_note: approvalNote || null,
          }),
        },
      );
      setEnquiries((current) => upsertRecord(current, record));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Review failed.");
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
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedGap.enquiry_id}/resolve-gap`,
        {
          method: "POST",
          body: JSON.stringify({
            human_resolution: gapResolution,
            reviewer_note: gapNote || "Resolved in the CS queue.",
          }),
        },
      );
      setEnquiries((current) => upsertRecord(current, record));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Gap resolution failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function draftKbEntry() {
    if (!selectedGap) {
      return;
    }
    setLoadingAction("draft-kb");
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedGap.enquiry_id}/draft-kb`,
        { method: "POST" },
      );
      setEnquiries((current) => upsertRecord(current, record));
      setActiveTab("kb");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "KB draft failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function reviewKbEntry(status: "approved" | "rejected") {
    if (!selectedGap) {
      return;
    }
    setLoadingAction(`kb-${status}`);
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedGap.enquiry_id}/review-kb`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            reviewer_note:
              kbReviewNote ||
              (status === "approved"
                ? "Approved for the demo knowledge base."
                : "Rejected for revision."),
          }),
        },
      );
      setEnquiries((current) => upsertRecord(current, record));
      if (status === "rejected" && selectedGapId === record.enquiry_id) {
        const nextDraft = pendingKbDrafts.find(
          (draftRecord) => draftRecord.enquiry_id !== record.enquiry_id,
        );
        setSelectedGapId(nextDraft?.enquiry_id ?? "");
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "KB review failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(themeStorageKey, next);
      return next;
    });
  }

  return (
    <main className="chat-product-shell" data-theme={theme}>
      <header className="chat-product-topbar">
        <div className="chat-product-brand">
          <span>BOLDR</span>
          <strong>SignalDesk</strong>
        </div>
        <nav className="workspace-tabs" aria-label="Workspace tabs">
          {tabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "workspace-tab active" : "workspace-tab"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            aria-pressed={theme === "dark"}
            className="theme-toggle"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "dark" ? (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M20.4 14.6A8.2 8.2 0 0 1 9.4 3.6a7.7 7.7 0 1 0 11 11Z" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </button>
          <div
            aria-label={`Backend ${isHealthy ? "connected" : "offline"}`}
            className={isHealthy ? "backend-pill ok" : "backend-pill bad"}
            role="status"
            title={`Backend ${isHealthy ? "connected" : "offline"}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              {isHealthy ? (
                <path d="M20 6 9 17l-5-5" />
              ) : (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              )}
            </svg>
          </div>
          <button
            aria-label="Open system details"
            aria-pressed={activeTab === "system"}
            className={
              activeTab === "system"
                ? "system-details-icon-button active"
                : "system-details-icon-button"
            }
            onClick={() => setActiveTab("system")}
            title="System Details"
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.5a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.5a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      {statusMessage ? (
        <div className="workspace-status" role="status">
          {statusMessage}
        </div>
      ) : null}

      {activeTab === "chat" ? (
        <section className="workspace-view chat-view" aria-labelledby="chat-heading">
          <div className="chat-main-panel">
            <div className="chat-heading">
              <div>
                <p className="eyebrow">Customer Chat</p>
                <h1 id="chat-heading">Ask BOLDR support intelligence anything.</h1>
              </div>
              <div className="chat-heading-actions">
                <button
                  className="secondary-action new-conversation-action"
                  onClick={startNewConversation}
                  type="button"
                >
                  New conversation
                </button>
                <button
                  className="secondary-action new-conversation-action reset-demo-action"
                  disabled={loadingAction !== null}
                  onClick={() => void resetDemo()}
                  type="button"
                >
                  {loadingAction === "reset-demo" ? "Resetting" : "Reset demo"}
                </button>
              </div>
            </div>

            <div className="message-stream" aria-live="polite" ref={messageStreamRef}>
              {enquiries.length === 0 && !pendingMessage ? (
                <div className="empty-chat-state">
                  <p className="eyebrow">Ready</p>
                  <h2>Type a question or run a real sample enquiry.</h2>
                  <p>
                    The system will classify the buyer persona, search BOLDR sources,
                    expose the evidence path, and pause for human approval before a
                    customer answer is shown.
                  </p>
                </div>
              ) : null}
              {enquiries.map((record) => (
                <ConversationRecord key={record.enquiry_id} record={record} />
              ))}
              {pendingMessage ? <PendingConversation message={pendingMessage} /> : null}
            </div>

            <div className="chat-composer">
              <div className="sample-select-wrap">
                <select
                  aria-label="Try a sample enquiry"
                  onChange={(event) => handleSampleChange(event.target.value)}
                  value={selectedSampleId}
                >
                  <option value="">Try a sample enquiry</option>
                  {sampleOptions.map((ticket) => (
                    <option key={ticket.ticket_id} value={ticket.ticket_id}>
                      {ticket.ticket_id} - {ticket.subject}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true" className="sample-select-icon" />
              </div>
              <textarea
                aria-label="Customer question"
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const selectedSample = sampleOptions.find(
                    (sample) => sample.ticket_id === selectedSampleId,
                  );
                  setComposer(nextValue);
                  if (selectedSample && nextValue !== sampleComposerText(selectedSample)) {
                    setSelectedSampleId("");
                  }
                  requestAnimationFrame(() => scrollMessagesToBottom());
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void submitEnquiry();
                  }
                }}
                onFocus={() => scrollMessagesToBottom()}
                placeholder="Example: Are BOLDR's FKM rubber straps BPA-free and safe for kids?"
                value={composer}
              />
              <button
                className="primary-action rugged-action"
                disabled={loadingAction === "submit"}
                onClick={submitEnquiry}
                type="button"
              >
                {loadingAction === "submit" ? "Processing" : "Send"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "approvals" ? (
        <section className="workspace-view queue-view" aria-labelledby="approvals-heading">
          <QueueList
            emptyLabel="No answerable demo drafts yet."
            items={approvalQueue}
            selectedId={selectedApproval?.enquiry_id ?? ""}
            title="Approval Queue"
            onSelect={setSelectedApprovalId}
          />
          <div className="queue-detail-panel">
            {selectedApproval ? (
              <>
                <PanelHeading
                  eyebrow={selectedApproval.enquiry_id}
                  title={selectedApproval.ticket.subject}
                  status={formatLabel(selectedApproval.approval_state.status)}
                />
                <SignalRow
                  values={[
                    selectedApproval.classification.persona,
                    selectedApproval.classification.intent,
                    `${selectedApproval.retrieval.evidence.length} evidence cards`,
                    formatLabel(selectedApproval.state),
                  ]}
                />
                <div className="detail-grid two">
                  <InfoBlock label="Customer Question" text={selectedApproval.ticket.message_body} />
                  <InfoBlock
                    label="Routing Guardrail"
                    text={selectedApproval.classification.routing_reason}
                  />
                </div>
                <label className="field-stack">
                  <span>Draft Reply</span>
                  <textarea
                    onChange={(event) => setApprovalDraft(event.target.value)}
                    value={approvalDraft}
                  />
                </label>
                <label className="field-stack">
                  <span>Reviewer Note</span>
                  <input
                    onChange={(event) => setApprovalNote(event.target.value)}
                    placeholder="Optional note"
                    value={approvalNote}
                  />
                </label>
                <div className="action-row">
                  <button
                    className="secondary-action"
                    disabled={loadingAction !== null || selectedApproval.state === "approved"}
                    onClick={() => void reviewAnswer("approved")}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="primary-action"
                    disabled={loadingAction !== null || approvalDraft.trim().length < 5}
                    onClick={() => void reviewAnswer("edited_and_approved")}
                    type="button"
                  >
                    Edit & Approve
                  </button>
                  <button
                    className="danger-action"
                    disabled={loadingAction !== null}
                    onClick={() => void reviewAnswer("rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
                <EvidenceGrid record={selectedApproval} />
              </>
            ) : (
              <EmptyPanel title="No pending approvals" text="Answerable demo enquiries will appear here." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "cs" ? (
        <section className="workspace-view queue-view" aria-labelledby="cs-heading">
          <QueueList
            emptyLabel="No unresolved demo gaps yet."
            items={gapQueue}
            selectedId={selectedGap?.enquiry_id ?? ""}
            title="CS Queue"
            onSelect={setSelectedGapId}
          />
          <div className="queue-detail-panel">
            {selectedGap?.gap_state ? (
              <>
                <PanelHeading
                  eyebrow={`${selectedGap.gap_state.priority} priority`}
                  title={selectedGap.gap_state.gap_theme}
                  status={formatLabel(selectedGap.gap_state.status)}
                />
                <SignalRow
                  values={[
                    selectedGap.classification.persona,
                    selectedGap.gap_state.owner,
                    selectedGap.gap_state.product_page_update_needed
                      ? "Product-page gap"
                      : "Support-only gap",
                    selectedGap.gap_state.marketing_signal
                      ? "Marketing signal"
                      : "No marketing flag",
                  ]}
                />
                <div className="detail-grid two">
                  <InfoBlock label="Customer Question" text={selectedGap.ticket.message_body} />
                  <InfoBlock label="Missing Knowledge" text={selectedGap.gap_state.missing_knowledge} />
                  <InfoBlock label="Suggested Next Action" text={selectedGap.gap_state.suggested_next_action} />
                  <InfoBlock
                    label="Evidence Attempted"
                    text={
                      selectedGap.retrieval.evidence[0]?.excerpt ??
                      "No local evidence produced a definitive answer."
                    }
                  />
                </div>
                <label className="field-stack">
                  <span>Verified Resolution</span>
                  <textarea
                    onChange={(event) => setGapResolution(event.target.value)}
                    value={gapResolution}
                  />
                </label>
                <label className="field-stack">
                  <span>Resolution Note</span>
                  <input
                    onChange={(event) => setGapNote(event.target.value)}
                    placeholder="Optional CS note"
                    value={gapNote}
                  />
                </label>
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
                    disabled={loadingAction !== null || !selectedGap.gap_state.human_resolution}
                    onClick={draftKbEntry}
                    type="button"
                  >
                    Draft KB Entry
                  </button>
                </div>
              </>
            ) : (
              <EmptyPanel title="No CS ticket selected" text="Unanswerable enquiries will route here." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "kb" ? (
        <section className="workspace-view kb-view" aria-labelledby="kb-heading">
          <div className="knowledge-summary">
            <PanelHeading
              eyebrow="Knowledge Base"
              title="Source coverage and generated additions"
              status={`${diagnostics?.document_chunk_count ?? 0} chunks`}
            />
            <div className="metric-strip">
              <Metric label="FAQ entries" value={diagnostics?.faq_entry_count ?? 0} />
              <Metric label="Product models" value={diagnostics?.product_model_count ?? 0} />
              <Metric label="Strap SKUs" value={diagnostics?.strap_item_count ?? 0} />
              <Metric label="Demo KB drafts" value={gapQueue.filter((record) => record.gap_state?.kb_draft).length} />
            </div>
            <div className="source-chip-grid">
              {datasetOverview.sources.map((source) => (
                <span key={source.file_name}>
                  {source.file_name} - {source.exists ? "ready" : "missing"}
                </span>
              ))}
            </div>
          </div>

          <div className="kb-columns">
            <section className="kb-column">
              <h2>Draft Queue</h2>
              {pendingKbDrafts.length === 0 ? (
                <EmptyPanel title="No generated KB drafts" text="Resolve a CS gap to create a draft." />
              ) : (
                pendingKbDrafts.map((record) => (
                  <KBDraftCard
                    key={record.enquiry_id}
                    record={record}
                    selected={selectedGap?.enquiry_id === record.enquiry_id}
                    onSelect={() => setSelectedGapId(record.enquiry_id)}
                  />
                ))
              )}
            </section>
            <section className="kb-column">
              <h2>Approved Additions</h2>
              {approvedKbAdditions.length === 0 ? (
                <EmptyPanel title="No approved additions yet" text="Approved KB drafts will collect here." />
              ) : (
                approvedKbAdditions.map((record) => <KBDraftCard key={record.enquiry_id} record={record} />)
              )}
            </section>
          </div>

          {selectedGap?.gap_state?.kb_draft ? (
            <div className="kb-review-panel">
              <PanelHeading
                eyebrow={selectedGap.enquiry_id}
                title={selectedGap.gap_state.kb_draft.question}
                status={formatLabel(selectedGap.gap_state.status)}
              />
              <p>{selectedGap.gap_state.kb_draft.answer}</p>
              <label className="field-stack">
                <span>KB Review Note</span>
                <input
                  onChange={(event) => setKbReviewNote(event.target.value)}
                  placeholder="Optional KB review note"
                  value={kbReviewNote}
                />
              </label>
              <div className="action-row">
                <button
                  className="secondary-action"
                  disabled={loadingAction !== null}
                  onClick={() => void reviewKbEntry("approved")}
                  type="button"
                >
                  Approve KB Draft
                </button>
                <button
                  className="danger-action"
                  disabled={loadingAction !== null}
                  onClick={() => void reviewKbEntry("rejected")}
                  type="button"
                >
                  Reject KB Draft
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "marketing" ? (
        <section className="workspace-view marketing-view" aria-labelledby="marketing-heading">
          <PanelHeading
            eyebrow="Marketing Intel"
            title="Customer questions becoming product and campaign signals"
            status={`${themeRadar?.meta.theme_count ?? 0} existing themes`}
          />
          <div className="metric-strip">
            <Metric label="Dataset themes" value={themeRadar?.meta.theme_count ?? 0} />
            <Metric label="Demo signals" value={enquiries.length} />
            <Metric label="Live gaps" value={gapQueue.length} />
            <Metric label="Product-page gaps" value={productPageSignals.length} />
          </div>

          <section className="marketing-bonus-shortcut" aria-labelledby="bonus-shortcut-heading">
            <div>
              <span className="deliverable-eyebrow">Bonus Challenge</span>
              <h2 id="bonus-shortcut-heading">External benchmark ready for judges</h2>
              <p>
                Internal support themes are compared with public watch-market sentiment to
                separate BOLDR-specific gaps from market-wide signals.
              </p>
            </div>
            <div className="bonus-shortcut-stats">
              <div>
                <strong>{externalBenchmarks.length}</strong>
                <span>benchmarked themes</span>
              </div>
              <div>
                <strong>{externalSources.length}</strong>
                <span>source groups</span>
              </div>
              <div>
                <strong>{marketWideBenchmarkCount}</strong>
                <span>market-wide signals</span>
              </div>
            </div>
            <a className="secondary-action bonus-jump-link" href="#external-benchmark-section">
              View External Benchmark
            </a>
          </section>

          <section className="marketing-panel marketing-deliverable-panel monthly-brief-panel">
            <div className="deliverable-header">
              <div>
                <span className="deliverable-eyebrow">Monthly Brief</span>
                <h2>What customers are asking that is not on your product pages</h2>
              </div>
              <span className="status-pill">{marketingBrief?.period_label ?? "Monthly output"}</span>
            </div>
            <div className="deliverable-meta-grid">
              <div>
                <span>Source tickets</span>
                <strong>{marketingBrief?.source_ticket_count ?? 0}</strong>
              </div>
              <div>
                <span>Persona-tagged themes</span>
                <strong>{marketingOpportunities.length}</strong>
              </div>
              <div>
                <span>Product page updates</span>
                <strong>{productPageOpportunities.length}</strong>
              </div>
              <div>
                <span>Live demo gaps</span>
                <strong>{productPageSignals.length}</strong>
              </div>
            </div>
            {monthlyBriefOpportunities.length === 0 ? (
              <p className="muted-copy">No product-page opportunities are available yet.</p>
            ) : (
              <div className="brief-opportunity-grid">
                {monthlyBriefOpportunities.map((opportunity) => (
                  <article
                    className={`brief-opportunity-card ${badgeToneClass(opportunity.persona_focus[0] ?? "")}`}
                    key={opportunity.theme_name}
                  >
                    <div className="opportunity-topline">
                      <span>{opportunity.theme_name}</span>
                      {opportunity.product_page_update_needed ? (
                        <em className="insight-chip tone-warning">Page gap</em>
                      ) : (
                        <em className="insight-chip tone-success">Campaign ready</em>
                      )}
                    </div>
                    <h3>{opportunity.campaign_angle}</h3>
                    <p>{opportunity.insight}</p>
                    <div className="persona-chip-row">
                      {opportunity.persona_focus.map((persona) => (
                        <span className={`insight-chip ${badgeToneClass(persona)}`} key={persona}>
                          {persona}
                        </span>
                      ))}
                    </div>
                    <div className="opportunity-action">
                      <span>Recommended action</span>
                      <strong>{opportunity.recommended_action}</strong>
                    </div>
                    <div className="ticket-ref-row">
                      {opportunity.evidence_ticket_ids.map((ticketId) => (
                        <span key={ticketId}>{ticketId}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="marketing-panel marketing-deliverable-panel weekly-cluster-panel">
            <div className="deliverable-header">
              <div>
                <span className="deliverable-eyebrow">Weekly Theme Clustering</span>
                <h2>Novel and recurring questions grouped by buyer theme</h2>
              </div>
              <span className="status-pill">
                {themeRadar?.meta.clustered_ticket_count ?? 0} clustered tickets
              </span>
            </div>
            {weeklyThemeClusters.length === 0 ? (
              <p className="muted-copy">No theme clusters are available yet.</p>
            ) : (
              <div className="theme-cluster-list">
                {weeklyThemeClusters.map((theme) => {
                  const dominantPersona = dominantPersonaFromBreakdown(theme.persona_breakdown);
                  const sampleQuestion =
                    theme.common_customer_wording[0] ?? theme.evidence[0]?.customer_wording ?? "";
                  return (
                    <article
                      className={`theme-cluster-row ${badgeToneClass(dominantPersona)}`}
                      key={theme.theme_name}
                    >
                      <div className="theme-cluster-main">
                        <div className="signal-card-header">
                          <strong>{theme.theme_name}</strong>
                          <span className="signal-metric">{theme.frequency} tickets</span>
                        </div>
                        {sampleQuestion ? <p>{sampleQuestion}</p> : null}
                        <div className="signal-card-footer">
                          <span className={`insight-chip ${badgeToneClass(dominantPersona)}`}>
                            {dominantPersona}
                          </span>
                          <span className="insight-chip tone-accent">
                            {formatLabel(theme.trend_direction)}
                          </span>
                          {theme.product_page_gap ? (
                            <span className="insight-chip tone-warning">Product page gap</span>
                          ) : (
                            <span className="insight-chip tone-success">Covered</span>
                          )}
                          {theme.gap_count > 0 ? (
                            <span className="insight-chip tone-warning">
                              {theme.gap_count} unresolved
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="theme-cluster-actions">
                        <div>
                          <span>KB action</span>
                          <p>{theme.recommended_kb_action}</p>
                        </div>
                        <div>
                          <span>Marketing action</span>
                          <p>{theme.recommended_marketing_action}</p>
                        </div>
                        <div className="ticket-ref-row">
                          {theme.representative_ticket_ids.map((ticketId) => (
                            <span key={ticketId}>{ticketId}</span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="marketing-panel marketing-deliverable-panel external-benchmark-panel"
            id="external-benchmark-section"
          >
            <div className="deliverable-header">
              <div>
                <span className="deliverable-eyebrow">Bonus External Benchmark</span>
                <h2>Internal demand vs external watch-market sentiment</h2>
              </div>
              <span className="status-pill">{externalSourceTypes.size} source types</span>
            </div>
            <div className="deliverable-meta-grid">
              <div>
                <span>Benchmarked themes</span>
                <strong>{externalBenchmarks.length}</strong>
              </div>
              <div>
                <span>Source groups</span>
                <strong>{externalSources.length}</strong>
              </div>
              <div>
                <span>Market-wide signals</span>
                <strong>{marketWideBenchmarkCount}</strong>
              </div>
              <div>
                <span>Source URLs</span>
                <strong>{externalSourceUrlCount}</strong>
              </div>
            </div>
            {visibleExternalBenchmarks.length === 0 ? (
              <p className="muted-copy">External benchmark data is unavailable.</p>
            ) : (
              <div className="external-benchmark-grid">
                {visibleExternalBenchmarks.map((benchmark) => {
                  const externalSourceCount =
                    benchmark.external_source_count ?? benchmark.external_sources.length;
                  const signalStrength = benchmark.signal_strength ?? "directional";
                  const rationale =
                    benchmark.benchmark_rationale ??
                    "Internal support themes are being compared against curated external market signals.";
                  const validationSteps = benchmark.validation_steps ?? [];
                  return (
                    <article
                      className={`external-benchmark-card ${benchmarkToneClass(benchmark)}`}
                      key={benchmark.theme_key}
                    >
                      <div className="external-benchmark-heading">
                        <span>{formatLabel(benchmark.external_sentiment)}</span>
                        <strong>{Math.round(benchmark.confidence * 100)}%</strong>
                      </div>
                      <h3>{benchmark.theme}</h3>
                      <div className="signal-card-footer">
                        <span className={`insight-chip ${benchmarkToneClass(benchmark)}`}>
                          {formatBenchmarkClassification(benchmark.classification)}
                        </span>
                        <span className="insight-chip tone-accent">
                          {benchmark.external_mention_count} external mentions
                        </span>
                        <span className="insight-chip tone-neutral">
                          {benchmark.internal_ticket_count} internal tickets
                        </span>
                        <span className="insight-chip tone-neutral">
                          {formatLabel(signalStrength)} signal
                        </span>
                        <span className="insight-chip tone-accent">
                          {externalSourceCount} sources
                        </span>
                      </div>
                      <p>{rationale}</p>
                      <p>{benchmark.recommended_action}</p>
                      <div className="benchmark-persona-row">
                        {benchmark.internal_personas.slice(0, 3).map((persona) => (
                          <span className={`insight-chip ${badgeToneClass(persona)}`} key={persona}>
                            {persona}
                          </span>
                        ))}
                      </div>
                      <div className="benchmark-source-list">
                        {benchmark.external_sources.slice(0, 2).map((source) => (
                          <a href={source.source_url} key={source.source_url} rel="noreferrer" target="_blank">
                            {source.name} - {source.mention_count} mentions
                          </a>
                        ))}
                      </div>
                      {validationSteps.length > 0 ? (
                        <div className="benchmark-validation-list">
                          {validationSteps.slice(0, 2).map((step) => (
                            <span key={step}>{step}</span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
            <div className="source-registry-strip">
              {externalSources.slice(0, 5).map((source) => (
                <a href={source.url} key={source.source_id} rel="noreferrer" target="_blank">
                  <strong>{source.name}</strong>
                  <span>{source.source_type.replaceAll("_", " ")}</span>
                </a>
              ))}
            </div>
          </section>

          <div className="marketing-grid">
            <section className="marketing-panel">
              <h2>Five-persona breakdown</h2>
              <div className="persona-signal-list">
                {requiredPersonas.map((persona) => (
                  <div className={badgeToneClass(persona)} key={persona}>
                    <span>{persona}</span>
                    <strong>{livePersonaCounts[persona] ?? 0}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="marketing-panel">
              <h2>Live demo signals</h2>
              {liveGapThemes.length === 0 ? (
                <p className="muted-copy">Submit a gap enquiry to create a live signal.</p>
              ) : (
                liveGapThemes.map(([theme, count]) => (
                  <article className="signal-card market-signal-card tone-warning" key={theme}>
                    <div className="signal-card-header">
                      <strong>{theme}</strong>
                      <span className="signal-metric">{count} signal{count === 1 ? "" : "s"}</span>
                    </div>
                    <p>
                      Recommended action: add product-page proof points and FAQ copy before
                      using this claim in campaigns.
                    </p>
                    <div className="signal-card-footer">
                      <span className="insight-chip tone-warning">Needs proof</span>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="marketing-panel">
              <h2>Campaign and page actions</h2>
              {marketingOpportunities.slice(0, 4).map((opportunity) => (
                <article
                  className={`signal-card market-signal-card ${badgeToneClass(opportunity.persona_focus[0] ?? "")}`}
                  key={opportunity.theme_name}
                >
                  <div className="signal-card-header">
                    <strong>{opportunity.campaign_angle}</strong>
                    <span className="signal-metric">
                      {opportunity.evidence_ticket_ids.length} refs
                    </span>
                  </div>
                  <div className="persona-chip-row">
                    {opportunity.persona_focus.map((persona) => (
                      <span className={`insight-chip ${badgeToneClass(persona)}`} key={persona}>
                        {persona}
                      </span>
                    ))}
                  </div>
                  <p>{opportunity.recommended_action}</p>
                  <div className="signal-card-footer">
                    {opportunity.product_page_update_needed ? (
                      <span className="insight-chip tone-warning">Product page update</span>
                    ) : (
                      <span className="insight-chip tone-success">Campaign ready</span>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "system" ? (
        <section className="workspace-view system-details-view">
          <div className="system-summary-bar">
            <span>{workflowStatus?.stable_endpoint_count ?? 0} stable endpoints</span>
            <span>{initialGaps.length} dataset gaps</span>
            <span>{initialGapMetrics?.product_page_update_needed_count ?? 0} product-page gaps</span>
          </div>
          <div className="system-details-content">{systemDetails}</div>
        </section>
      ) : null}
    </main>
  );
}

function ConversationRecord({ record }: { record: AdhocEnquiryRecord }) {
  return (
    <article className="conversation-record">
      <div className="chat-message user">
        <span>{record.customer_name}</span>
        <p>{record.ticket.message_body}</p>
      </div>
      <div className="ai-review-block">
        <div className="ai-review-heading">
          <span>AI review</span>
          <strong>{record.enquiry_id}</strong>
        </div>
        <div className="trace-list">
          {record.processing_trace.map((event, index) => (
            <TraceRow event={event} key={`${event.step}-${index}`} />
          ))}
        </div>
      </div>
      <div className="chat-message assistant">
        <span>BOLDR Intelligence</span>
        <p>{customerStateMessage(record)}</p>
        {record.customer_visible_response ? (
          <div className="assistant-markdown">
            <MarkdownResponse text={record.customer_visible_response} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PendingConversation({ message }: { message: string }) {
  return (
    <article className="conversation-record pending-conversation">
      <div className="chat-message user">
        <span>Demo Customer</span>
        <p>{message}</p>
      </div>
      <div
        aria-label="BOLDR Intelligence is processing"
        className="chat-message assistant typing-message"
        role="status"
      >
        <span>BOLDR Intelligence</span>
        <div aria-hidden="true" className="typing-loader">
          <i />
          <i />
          <i />
        </div>
      </div>
    </article>
  );
}

function MarkdownResponse({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (!hasExplicitMarkdown(trimmed)) {
    const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
    const [lead, ...bodySentences] = sentences;
    const bodyParagraphs = [];
    for (let index = 0; index < bodySentences.length; index += 2) {
      bodyParagraphs.push(bodySentences.slice(index, index + 2).join(" "));
    }

    return (
      <>
        <p className="markdown-lead">{renderInlineMarkdown(lead)}</p>
        {bodyParagraphs.map((paragraph, index) => (
          <p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraph)}</p>
        ))}
      </>
    );
  }

  return <>{renderMarkdownBlocks(trimmed)}</>;
}

function hasExplicitMarkdown(text: string) {
  return /(^|\n)\s{0,3}(#{1,3}\s|[-*]\s+|\d+\.\s+)|\*\*[^*]+\*\*|__[^_]+__|\n\s*\n/.test(text);
}

function renderMarkdownBlocks(text: string) {
  const blocks: ReactNode[] = [];
  const paragraphLines: string[] = [];
  const bulletLines: string[] = [];
  const orderedLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }
    const paragraph = paragraphLines.join(" ");
    blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInlineMarkdown(paragraph)}</p>);
    paragraphLines.length = 0;
  }

  function flushBullets() {
    if (bulletLines.length === 0) {
      return;
    }
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {bulletLines.map((line, index) => (
          <li key={`${line}-${index}`}>{renderInlineMarkdown(line)}</li>
        ))}
      </ul>,
    );
    bulletLines.length = 0;
  }

  function flushOrdered() {
    if (orderedLines.length === 0) {
      return;
    }
    blocks.push(
      <ol key={`ordered-${blocks.length}`}>
        {orderedLines.map((line, index) => (
          <li key={`${line}-${index}`}>{renderInlineMarkdown(line)}</li>
        ))}
      </ol>,
    );
    orderedLines.length = 0;
  }

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushBullets();
      flushOrdered();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushBullets();
      flushOrdered();
      const level = heading[1].length;
      const content = renderInlineMarkdown(heading[2]);
      if (level === 1) {
        blocks.push(<h3 key={`heading-${blocks.length}`}>{content}</h3>);
      } else if (level === 2) {
        blocks.push(<h4 key={`heading-${blocks.length}`}>{content}</h4>);
      } else {
        blocks.push(<h5 key={`heading-${blocks.length}`}>{content}</h5>);
      }
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      flushParagraph();
      flushOrdered();
      bulletLines.push(bullet[1]);
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      flushBullets();
      orderedLines.push(ordered[1]);
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushBullets();
  flushOrdered();
  return blocks;
}

function renderInlineMarkdown(value: string) {
  return value.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((segment, index) => {
    if (
      (segment.startsWith("**") && segment.endsWith("**")) ||
      (segment.startsWith("__") && segment.endsWith("__"))
    ) {
      return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
    }
    return segment;
  });
}

function customerStateMessage(record: AdhocEnquiryRecord) {
  if (record.customer_visible_response) {
    return "Approved answer released to the customer chat.";
  }
  if (record.state === "awaiting_approval") {
    return "Draft prepared. Awaiting BOLDR team approval.";
  }
  if (record.state === "rejected") {
    return "Draft rejected. The BOLDR team should revise before replying.";
  }
  if (record.state === "needs_team_confirmation") {
    return "This needs team confirmation. A CS ticket has been created.";
  }
  if (record.state === "gap_resolved") {
    return "Team confirmation added. A KB draft can now be generated.";
  }
  if (record.state === "kb_draft_ready") {
    return "Verified resolution converted into a KB draft for approval.";
  }
  if (record.state === "kb_approved") {
    return "KB addition approved and available for future support answers.";
  }
  if (record.state === "kb_rejected") {
    return "KB draft rejected for revision.";
  }
  return formatLabel(record.state);
}

function TraceRow({ event }: { event: TraceEvent }) {
  return (
    <details className={`trace-row ${event.status}`} open>
      <summary>
        <span>{event.title}</span>
        <strong aria-label={formatLabel(event.status)} className={badgeToneClass(event.status)}>
          {traceStatusIcon(event.status)}
        </strong>
      </summary>
      <p>{event.detail}</p>
      {event.source_refs.length > 0 ? (
        <div className="trace-source-list">
          {event.source_refs.map((source, index) => (
            <em key={`${source}-${index}`}>{source}</em>
          ))}
        </div>
      ) : null}
    </details>
  );
}

function traceStatusIcon(status: TraceEvent["status"]) {
  if (status === "completed") {
    return "✓";
  }
  if (status === "blocked") {
    return "×";
  }
  return "•";
}

function QueueList({
  emptyLabel,
  items,
  selectedId,
  title,
  onSelect,
}: {
  emptyLabel: string;
  items: AdhocEnquiryRecord[];
  selectedId: string;
  title: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="queue-list-panel">
      <div className="queue-title">
        <p className="eyebrow">{title}</p>
        <strong>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <p className="muted-copy">{emptyLabel}</p>
      ) : (
        <div className="queue-list">
          {items.map((record) => (
            <button
              className={selectedId === record.enquiry_id ? "queue-row active" : "queue-row"}
              key={record.enquiry_id}
              onClick={() => onSelect(record.enquiry_id)}
              type="button"
            >
              <span>
                <strong>{record.enquiry_id}</strong>
                <small>{record.ticket.subject}</small>
              </span>
              <em className={badgeToneClass(record.state)}>{formatLabel(record.state)}</em>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function PanelHeading({
  eyebrow,
  status,
  title,
}: {
  eyebrow: string;
  status: string;
  title: string;
}) {
  return (
    <div className="panel-heading rugged-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span className={`status-pill ${badgeToneClass(status)}`}>{status}</span>
    </div>
  );
}

function SignalRow({ values }: { values: string[] }) {
  return (
    <div className="signal-row">
      {values.map((value, index) => (
        <span className={badgeToneClass(value)} key={`${value}-${index}`}>{value}</span>
      ))}
    </div>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <p>{text}</p>
    </div>
  );
}

function EvidenceGrid({ record }: { record: AdhocEnquiryRecord }) {
  return (
    <div className="evidence-grid">
      <section>
        <h3>Evidence</h3>
        {record.retrieval.evidence.slice(0, 4).map((evidence, index) => (
          <article className="evidence-card" key={`${evidence.evidence_id}-${index}`}>
            <strong>{evidence.source_file}</strong>
            <span>{evidence.section_title}</span>
            <p>{evidence.excerpt}</p>
          </article>
        ))}
      </section>
      <section>
        <h3>Guardrails</h3>
        {record.draft.guardrails.map((guardrail, index) => (
          <article
            className={guardrail.passed ? "guardrail-card pass" : "guardrail-card fail"}
            key={`${guardrail.name}-${index}`}
          >
            <strong>{guardrail.passed ? "Pass" : "Review"}</strong>
            <p>{guardrail.message}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function KBDraftCard({
  onSelect,
  record,
  selected = false,
}: {
  onSelect?: () => void;
  record: AdhocEnquiryRecord;
  selected?: boolean;
}) {
  const draft = record.gap_state?.kb_draft;
  const content = (
    <>
      <span>{record.enquiry_id} - {formatLabel(record.gap_state?.status ?? record.state)}</span>
      <strong>{draft?.question ?? record.gap_state?.gap_theme ?? record.ticket.subject}</strong>
      <p>{draft?.answer ?? record.gap_state?.missing_knowledge ?? record.ticket.message_body}</p>
    </>
  );

  if (onSelect) {
    return (
      <button
        className={selected ? "kb-draft-tile active" : "kb-draft-tile"}
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className="kb-draft-tile approved">{content}</article>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyPanel({ text, title }: { text: string; title: string }) {
  return (
    <div className="empty-panel">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
