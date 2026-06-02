"use client";

import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckSquare,
  Database,
  FileText,
  LayoutDashboard,
  Maximize2,
  MessagesSquare,
  Radar,
  Table2,
  Workflow,
  X,
} from "lucide-react";

import { resetDemoEnquiries } from "@/lib/api";
import { getConfiguredApiBaseUrl } from "@/lib/api";
import type {
  AdhocEnquiryRecord,
  DatasetOverview,
  ExternalBenchmark,
  ExternalBenchmarkOverview,
  ExternalSource,
  GapMetrics,
  InsightsOverview,
  KnowledgeGapRecord,
  MarketingOpportunity,
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
const tabIcons: Record<WorkspaceTab, typeof MessagesSquare> = {
  chat: MessagesSquare,
  approvals: CheckSquare,
  cs: Activity,
  kb: Database,
  marketing: Radar,
  system: LayoutDashboard,
};

const themeStorageKey = "boldr-ui-theme-v1";

const requiredPersonas = [
  "Health-Conscious Buyer",
  "Gifter",
  "Enthusiast / Collector",
  "Active / Outdoor Buyer",
  "Sustainability Advocate",
];

const reviewReasonOptions = [
  { code: "evidence_ok", label: "Evidence checked and valid" },
  { code: "tone_edit", label: "Tone/wording edit" },
  { code: "clarity_edit", label: "Clarity improvement" },
  { code: "factual_fix", label: "Factual correction" },
  { code: "policy_risk", label: "Policy/risk concern" },
  { code: "unsupported_claim", label: "Unsupported claim removed" },
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
  return (value ?? "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedApprovalId, setSelectedApprovalId] = useState("");
  const [selectedGapId, setSelectedGapId] = useState("");
  const [approvalDraft, setApprovalDraft] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalReasonCodes, setApprovalReasonCodes] = useState<string[]>([]);
  const [approvalCustomReasonCode, setApprovalCustomReasonCode] = useState("");
  const [approvalFactualCorrections, setApprovalFactualCorrections] = useState(false);
  const [gapResolution, setGapResolution] = useState("");
  const [gapNote, setGapNote] = useState("");
  const [kbReviewNote, setKbReviewNote] = useState("");
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const sampleMenuRef = useRef<HTMLDivElement | null>(null);

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

  const gapRecords = useMemo(
    () => enquiries.filter((record) => Boolean(record.gap_state)),
    [enquiries],
  );
  const gapQueue = useMemo(
    () =>
      gapRecords.filter((record) =>
        record.gap_state?.status === "needs_resolution" ||
        record.gap_state?.status === "resolved_needs_kb_draft",
      ),
    [gapRecords],
  );

  const selectedApproval =
    approvalQueue.find((record) => record.enquiry_id === selectedApprovalId) ??
    approvalQueue[0] ??
    null;
  const selectedCsGap =
    gapQueue.find((record) => record.enquiry_id === selectedGapId) ?? gapQueue[0] ?? null;
  const selectedGap =
    gapRecords.find((record) => record.enquiry_id === selectedGapId) ??
    selectedCsGap ??
    gapRecords[0] ??
    null;

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
    gapRecords.forEach((record) => {
      const theme = record.gap_state?.gap_theme ?? "Unclassified gap";
      counts[theme] = (counts[theme] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [gapRecords]);

  const approvedKbAdditions = gapRecords.filter(
    (record) => record.gap_state?.status === "approved" && record.gap_state.kb_draft,
  );
  const pendingKbDrafts = gapRecords.filter(
    (record) => record.gap_state?.status === "kb_draft_ready",
  );
  const productPageSignals = gapRecords.filter(
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
  const selectedSampleOption =
    sampleOptions.find((sample) => sample.ticket_id === selectedSampleId) ?? null;

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

  const scrollLatestUserMessageIntoView = useCallback((behavior: ScrollBehavior = "smooth") => {
    const stream = messageStreamRef.current;
    if (!stream) {
      return;
    }

    const pendingUserMessage = stream.querySelector<HTMLElement>(
      ".pending-conversation .chat-message.user",
    );
    const userMessages = stream.querySelectorAll<HTMLElement>(
      ".conversation-record .chat-message.user",
    );
    const latestUserMessage =
      pendingUserMessage ?? userMessages.item(userMessages.length - 1);

    latestUserMessage?.scrollIntoView({
      block: "start",
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
    setSampleMenuOpen(false);
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
    setSampleMenuOpen(false);
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
    function closeSampleMenu(event: MouseEvent) {
      if (!sampleMenuRef.current?.contains(event.target as Node)) {
        setSampleMenuOpen(false);
      }
    }

    function closeSampleMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSampleMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeSampleMenu);
    document.addEventListener("keydown", closeSampleMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeSampleMenu);
      document.removeEventListener("keydown", closeSampleMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "chat") {
      return;
    }
    const frame = requestAnimationFrame(() => scrollLatestUserMessageIntoView());
    return () => cancelAnimationFrame(frame);
  }, [activeTab, enquiries, pendingMessage, scrollLatestUserMessageIntoView]);

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
    if (!selectedCsGap && gapQueue[0]) {
      setSelectedGapId(gapQueue[0].enquiry_id);
    }
  }, [gapQueue, selectedCsGap]);

  useEffect(() => {
    if (!selectedApproval) {
      setApprovalDraft("");
      setApprovalNote("");
      setApprovalReasonCodes([]);
      setApprovalCustomReasonCode("");
      setApprovalFactualCorrections(false);
      return;
    }
    setApprovalDraft(
      selectedApproval.approval_state.edited_reply ??
        selectedApproval.draft.draft.draft_reply,
    );
    setApprovalNote(selectedApproval.approval_state.reviewer_note ?? "");
    setApprovalReasonCodes(selectedApproval.approval_state.reason_codes ?? []);
    setApprovalCustomReasonCode("");
    setApprovalFactualCorrections(selectedApproval.approval_state.factual_corrections_made ?? false);
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

  async function reviewAnswer(status: "approved" | "rejected") {
    if (!selectedApproval) {
      return;
    }
    const baseDraft = selectedApproval.draft.draft.draft_reply.trim();
    const nextDraft = approvalDraft.trim();
    const effectiveStatus =
      status === "approved" && nextDraft.length > 0 && nextDraft !== baseDraft
        ? "edited_and_approved"
        : status;
    setLoadingAction(effectiveStatus);
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedApproval.enquiry_id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            status: effectiveStatus,
            edited_reply: effectiveStatus === "edited_and_approved" ? approvalDraft : null,
            reviewer_note: approvalNote || null,
            reason_codes: approvalCustomReasonCode.trim()
              ? [...approvalReasonCodes, approvalCustomReasonCode.trim()]
              : approvalReasonCodes,
            factual_corrections_made: approvalFactualCorrections,
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
    if (!selectedCsGap) {
      return;
    }
    setLoadingAction("resolve-gap");
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedCsGap.enquiry_id}/resolve-gap`,
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
    if (!selectedCsGap) {
      return;
    }
    setLoadingAction("draft-kb");
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedCsGap.enquiry_id}/draft-kb`,
        { method: "POST" },
      );
      setEnquiries((current) => upsertRecord(current, record));
      setSelectedGapId(record.enquiry_id);
      setActiveTab("kb");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "KB draft failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function closeGap() {
    if (!selectedCsGap) {
      return;
    }
    setLoadingAction("close-gap");
    setStatusMessage("");
    try {
      const record = await fetchJson<AdhocEnquiryRecord>(
        `/api/enquiries/${selectedCsGap.enquiry_id}/close-gap`,
        { method: "POST" },
      );
      setEnquiries((current) => upsertRecord(current, record));
      const nextGap = gapQueue.find(
        (gapRecord) => gapRecord.enquiry_id !== record.enquiry_id,
      );
      setSelectedGapId(nextGap?.enquiry_id ?? "");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Gap close failed.");
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
      if (selectedGapId === record.enquiry_id) {
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
              {(() => {
                const Icon = tabIcons[tab.id];
                return <Icon aria-hidden="true" size={14} />;
              })()}
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
            <Bot aria-hidden="true" size={14} />
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
        <ChatTabView
          composer={composer}
          enquiries={enquiries}
          handleSampleChange={handleSampleChange}
          loadingAction={loadingAction}
          messageStreamRef={messageStreamRef}
          onComposerChange={(nextValue) => {
            const selectedSample = sampleOptions.find(
              (sample) => sample.ticket_id === selectedSampleId,
            );
            setComposer(nextValue);
            if (selectedSample && nextValue !== sampleComposerText(selectedSample)) {
              setSelectedSampleId("");
            }
            requestAnimationFrame(() => scrollMessagesToBottom());
          }}
          onComposerFocus={() => scrollMessagesToBottom()}
          onComposerKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void submitEnquiry();
            }
          }}
          onResetDemo={() => void resetDemo()}
          onSend={submitEnquiry}
          onStartConversation={startNewConversation}
          pendingMessage={pendingMessage}
          sampleMenuOpen={sampleMenuOpen}
          sampleMenuRef={sampleMenuRef}
          sampleOptions={sampleOptions}
          selectedSampleId={selectedSampleId}
          selectedSampleOption={selectedSampleOption}
          setSampleMenuOpen={setSampleMenuOpen}
        />
      ) : null}

      {activeTab === "approvals" ? (
        <ApprovalsTabView
          approvalDraft={approvalDraft}
          approvalNote={approvalNote}
          approvalReasonCodes={approvalReasonCodes}
          approvalCustomReasonCode={approvalCustomReasonCode}
          approvalFactualCorrections={approvalFactualCorrections}
          approvalQueue={approvalQueue}
          loadingAction={loadingAction}
          onApprove={(status) => void reviewAnswer(status)}
          onDraftChange={setApprovalDraft}
          onNoteChange={setApprovalNote}
          onReasonCodesChange={setApprovalReasonCodes}
          onCustomReasonCodeChange={setApprovalCustomReasonCode}
          onFactualCorrectionsChange={setApprovalFactualCorrections}
          onSelect={setSelectedApprovalId}
          selectedApproval={selectedApproval}
        />
      ) : null}

      {activeTab === "cs" ? (
        <CsQueueTabView
          gapNote={gapNote}
          gapQueue={gapQueue}
          gapResolution={gapResolution}
          loadingAction={loadingAction}
          onCloseGap={closeGap}
          onDraftKbEntry={draftKbEntry}
          onGapNoteChange={setGapNote}
          onGapResolutionChange={setGapResolution}
          onResolveGap={resolveGap}
          onSelect={setSelectedGapId}
          selectedGap={selectedCsGap}
        />
      ) : null}

      {activeTab === "kb" ? (
        <KnowledgeBaseTabView
          approvedKbAdditions={approvedKbAdditions}
          datasetOverview={datasetOverview}
          diagnostics={diagnostics}
          enquiries={enquiries}
          gapQueue={gapRecords}
          kbReviewNote={kbReviewNote}
          loadingAction={loadingAction}
          onKbReviewNoteChange={setKbReviewNote}
          onReviewKbEntry={(status) => void reviewKbEntry(status)}
          onSelectGap={setSelectedGapId}
          pendingKbDrafts={pendingKbDrafts}
          selectedGap={selectedGap}
        />
      ) : null}

      {activeTab === "marketing" ? (
        <MarketingTabView
          enquiriesCount={enquiries.length}
          externalBenchmarks={externalBenchmarks}
          externalSourceTypesSize={externalSourceTypes.size}
          externalSourceUrlCount={externalSourceUrlCount}
          externalSources={externalSources}
          gapQueueLength={gapQueue.length}
          liveGapThemes={liveGapThemes}
          livePersonaCounts={livePersonaCounts}
          marketWideBenchmarkCount={marketWideBenchmarkCount}
          marketingBrief={marketingBrief}
          marketingOpportunities={marketingOpportunities}
          monthlyBriefOpportunities={monthlyBriefOpportunities}
          productPageOpportunities={productPageOpportunities}
          productPageSignals={productPageSignals}
          themeRadar={themeRadar}
          visibleExternalBenchmarks={visibleExternalBenchmarks}
          weeklyThemeClusters={weeklyThemeClusters}
        />
      ) : null}

      {activeTab === "system" ? (
        <SystemTabView
          enquiries={enquiries}
          initialGapMetrics={initialGapMetrics}
          initialGaps={initialGaps}
          systemDetails={systemDetails}
          workflowStatus={workflowStatus}
        />
      ) : null}
    </main>
  );
}

function ChatTabView({
  composer,
  enquiries,
  handleSampleChange,
  loadingAction,
  messageStreamRef,
  onComposerChange,
  onComposerFocus,
  onComposerKeyDown,
  onResetDemo,
  onSend,
  onStartConversation,
  pendingMessage,
  sampleMenuOpen,
  sampleMenuRef,
  sampleOptions,
  selectedSampleId,
  selectedSampleOption,
  setSampleMenuOpen,
}: {
  composer: string;
  enquiries: AdhocEnquiryRecord[];
  handleSampleChange: (ticketId: string) => void;
  loadingAction: string | null;
  messageStreamRef: RefObject<HTMLDivElement | null>;
  onComposerChange: (nextValue: string) => void;
  onComposerFocus: () => void;
  onComposerKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onResetDemo: () => void;
  onSend: () => void;
  onStartConversation: () => void;
  pendingMessage: string;
  sampleMenuOpen: boolean;
  sampleMenuRef: RefObject<HTMLDivElement | null>;
  sampleOptions: TicketWorkflowSummary[];
  selectedSampleId: string;
  selectedSampleOption: TicketWorkflowSummary | null;
  setSampleMenuOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <section className="workspace-view chat-view" aria-labelledby="chat-heading">
      <div className="chat-main-panel">
        <div className="chat-heading">
          <div>
            <p className="eyebrow">Customer Chat</p>
            <h1 id="chat-heading">Ask BOLDR support intelligence anything.</h1>
          </div>
          <div className="chat-heading-actions">
            <button className="secondary-action new-conversation-action" onClick={onStartConversation} type="button">
              New conversation
            </button>
            <button
              className="secondary-action new-conversation-action reset-demo-action"
              disabled={loadingAction !== null}
              onClick={onResetDemo}
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
                The system will classify the buyer persona, search BOLDR sources, expose the
                evidence path, and pause for human approval before a customer answer is shown.
              </p>
            </div>
          ) : null}
          {enquiries.map((record) => (
            <ConversationRecord key={record.enquiry_id} record={record} />
          ))}
          {pendingMessage ? <PendingConversation message={pendingMessage} /> : null}
        </div>

        <div className="chat-composer">
          <div className="sample-select-wrap" ref={sampleMenuRef}>
            <button
              aria-expanded={sampleMenuOpen}
              aria-haspopup="listbox"
              className="sample-select-button"
              onClick={() => setSampleMenuOpen((open) => !open)}
              type="button"
            >
              <span>
                {selectedSampleOption
                  ? `${selectedSampleOption.ticket_id} - ${selectedSampleOption.subject}`
                  : "Try a sample enquiry"}
              </span>
              <span aria-hidden="true" className="sample-select-icon" />
            </button>
            {sampleMenuOpen ? (
              <div className="sample-select-menu" role="listbox">
                <button
                  aria-selected={selectedSampleId === ""}
                  className={selectedSampleId === "" ? "sample-option active" : "sample-option"}
                  onClick={() => handleSampleChange("")}
                  role="option"
                  type="button"
                >
                  <span>Try a sample enquiry</span>
                </button>
                {sampleOptions.map((ticket) => (
                  <button
                    aria-selected={selectedSampleId === ticket.ticket_id}
                    className={selectedSampleId === ticket.ticket_id ? "sample-option active" : "sample-option"}
                    key={ticket.ticket_id}
                    onClick={() => handleSampleChange(ticket.ticket_id)}
                    role="option"
                    type="button"
                  >
                    <strong>{ticket.ticket_id}</strong>
                    <span>{ticket.subject}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <textarea
            aria-label="Customer question"
            onChange={(event) => onComposerChange(event.target.value)}
            onFocus={onComposerFocus}
            onKeyDown={onComposerKeyDown}
            placeholder="Example: Are BOLDR's FKM rubber straps BPA-free and safe for kids?"
            value={composer}
          />
          <button className="primary-action rugged-action" disabled={loadingAction === "submit"} onClick={onSend} type="button">
            {loadingAction === "submit" ? "Processing" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MarketingTabView({
  enquiriesCount,
  externalBenchmarks,
  externalSourceTypesSize,
  externalSourceUrlCount,
  externalSources,
  gapQueueLength,
  liveGapThemes,
  livePersonaCounts,
  marketWideBenchmarkCount,
  marketingBrief,
  marketingOpportunities,
  monthlyBriefOpportunities,
  productPageOpportunities,
  productPageSignals,
  themeRadar,
  visibleExternalBenchmarks,
  weeklyThemeClusters,
}: {
  enquiriesCount: number;
  externalBenchmarks: ExternalBenchmark[];
  externalSourceTypesSize: number;
  externalSourceUrlCount: number;
  externalSources: ExternalSource[];
  gapQueueLength: number;
  liveGapThemes: Array<[string, number]>;
  livePersonaCounts: Record<string, number>;
  marketWideBenchmarkCount: number;
  marketingBrief: InsightsOverview["marketingBrief"];
  marketingOpportunities: MarketingOpportunity[];
  monthlyBriefOpportunities: MarketingOpportunity[];
  productPageOpportunities: MarketingOpportunity[];
  productPageSignals: AdhocEnquiryRecord[];
  themeRadar: InsightsOverview["themeRadar"];
  visibleExternalBenchmarks: ExternalBenchmark[];
  weeklyThemeClusters: ThemeRadarItem[];
}) {
  return (
    <section className="workspace-view marketing-view" aria-labelledby="marketing-heading">
      <PanelHeading
        eyebrow="Marketing Intel"
        title="Customer questions becoming product and campaign signals"
        status={`${themeRadar?.meta.theme_count ?? 0} existing themes`}
      />
      <div className="metric-strip">
        <Metric label="Dataset themes" value={themeRadar?.meta.theme_count ?? 0} />
        <Metric label="Demo signals" value={enquiriesCount} />
        <Metric label="Live gaps" value={gapQueueLength} />
        <Metric label="Product-page gaps" value={productPageSignals.length} />
      </div>

      <section className="marketing-bonus-shortcut" aria-labelledby="bonus-shortcut-heading">
        <div>
          <span className="deliverable-eyebrow">Bonus Challenge</span>
          <h2 id="bonus-shortcut-heading">External benchmark ready for judges</h2>
          <p>
            Internal support themes are compared with public watch-market sentiment to separate
            BOLDR-specific gaps from market-wide signals.
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

      <MarketingDeliverables
        externalBenchmarks={externalBenchmarks}
        externalSourceTypesSize={externalSourceTypesSize}
        externalSourceUrlCount={externalSourceUrlCount}
        externalSources={externalSources}
        liveGapThemes={liveGapThemes}
        livePersonaCounts={livePersonaCounts}
        marketWideBenchmarkCount={marketWideBenchmarkCount}
        marketingBrief={marketingBrief}
        marketingOpportunities={marketingOpportunities}
        monthlyBriefOpportunities={monthlyBriefOpportunities}
        productPageOpportunities={productPageOpportunities}
        productPageSignals={productPageSignals}
        visibleExternalBenchmarks={visibleExternalBenchmarks}
        weeklyThemeClusters={weeklyThemeClusters}
      />
    </section>
  );
}

function MarketingDeliverables({
  externalBenchmarks,
  externalSourceTypesSize,
  externalSourceUrlCount,
  externalSources,
  liveGapThemes,
  livePersonaCounts,
  marketWideBenchmarkCount,
  marketingBrief,
  marketingOpportunities,
  monthlyBriefOpportunities,
  productPageOpportunities,
  productPageSignals,
  visibleExternalBenchmarks,
  weeklyThemeClusters,
}: {
  externalBenchmarks: ExternalBenchmark[];
  externalSourceTypesSize: number;
  externalSourceUrlCount: number;
  externalSources: ExternalSource[];
  liveGapThemes: Array<[string, number]>;
  livePersonaCounts: Record<string, number>;
  marketWideBenchmarkCount: number;
  marketingBrief: InsightsOverview["marketingBrief"];
  marketingOpportunities: MarketingOpportunity[];
  monthlyBriefOpportunities: MarketingOpportunity[];
  productPageOpportunities: MarketingOpportunity[];
  productPageSignals: AdhocEnquiryRecord[];
  visibleExternalBenchmarks: ExternalBenchmark[];
  weeklyThemeClusters: ThemeRadarItem[];
}) {
  return (
    <>
      <section className="marketing-panel marketing-deliverable-panel monthly-brief-panel">
        <div className="deliverable-header">
          <div>
            <span className="deliverable-eyebrow">Monthly Brief</span>
            <h2>What customers are asking that is not on your product pages</h2>
          </div>
          <span className="status-pill">{marketingBrief?.period_label ?? "Monthly output"}</span>
        </div>
        <div className="deliverable-meta-grid">
          <div><span>Source tickets</span><strong>{marketingBrief?.source_ticket_count ?? 0}</strong></div>
          <div><span>Persona-tagged themes</span><strong>{marketingOpportunities.length}</strong></div>
          <div><span>Product page updates</span><strong>{productPageOpportunities.length}</strong></div>
          <div><span>Live demo gaps</span><strong>{productPageSignals.length}</strong></div>
        </div>
        {monthlyBriefOpportunities.length === 0 ? (
          <p className="muted-copy">No product-page opportunities are available yet.</p>
        ) : (
          <div className="brief-opportunity-grid">
            {monthlyBriefOpportunities.map((opportunity) => (
              <article className={`brief-opportunity-card ${badgeToneClass(opportunity.persona_focus[0] ?? "")}`} key={opportunity.theme_name}>
                <div className="opportunity-topline">
                  <span>{opportunity.theme_name}</span>
                  {opportunity.product_page_update_needed ? <em className="insight-chip tone-warning">Page gap</em> : <em className="insight-chip tone-success">Campaign ready</em>}
                </div>
                <h3>{opportunity.campaign_angle}</h3>
                <p>{opportunity.insight}</p>
                <div className="persona-chip-row">
                  {opportunity.persona_focus.map((persona) => (
                    <span className={`insight-chip ${badgeToneClass(persona)}`} key={persona}>{persona}</span>
                  ))}
                </div>
                <div className="opportunity-action"><span>Recommended action</span><strong>{opportunity.recommended_action}</strong></div>
                <div className="ticket-ref-row">
                  {opportunity.evidence_ticket_ids.map((ticketId) => <span key={ticketId}>{ticketId}</span>)}
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
          <span className="status-pill">{weeklyThemeClusters.length} visible themes</span>
        </div>
        {weeklyThemeClusters.length === 0 ? (
          <p className="muted-copy">No theme clusters are available yet.</p>
        ) : (
          <div className="theme-cluster-list">
            {weeklyThemeClusters.map((theme) => {
              const dominantPersona = dominantPersonaFromBreakdown(theme.persona_breakdown);
              const sampleQuestion = theme.common_customer_wording[0] ?? theme.evidence[0]?.customer_wording ?? "";
              return (
                <article className={`theme-cluster-row ${badgeToneClass(dominantPersona)}`} key={theme.theme_name}>
                  <div className="theme-cluster-main">
                    <div className="signal-card-header"><strong>{theme.theme_name}</strong><span className="signal-metric">{theme.frequency} tickets</span></div>
                    {sampleQuestion ? <p>{sampleQuestion}</p> : null}
                  </div>
                  <div className="theme-cluster-actions">
                    <div><span>KB action</span><p>{theme.recommended_kb_action}</p></div>
                    <div><span>Marketing action</span><p>{theme.recommended_marketing_action}</p></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="marketing-panel marketing-deliverable-panel external-benchmark-panel" id="external-benchmark-section">
        <div className="deliverable-header">
          <div><span className="deliverable-eyebrow">Bonus External Benchmark</span><h2>Internal demand vs external watch-market sentiment</h2></div>
          <span className="status-pill">{externalSourceTypesSize} source types</span>
        </div>
        <div className="deliverable-meta-grid">
          <div><span>Benchmarked themes</span><strong>{externalBenchmarks.length}</strong></div>
          <div><span>Source groups</span><strong>{externalSources.length}</strong></div>
          <div><span>Market-wide signals</span><strong>{marketWideBenchmarkCount}</strong></div>
          <div><span>Source URLs</span><strong>{externalSourceUrlCount}</strong></div>
        </div>
        <div className="external-benchmark-grid">
          {visibleExternalBenchmarks.map((benchmark) => (
            <article className={`external-benchmark-card ${benchmarkToneClass(benchmark)}`} key={benchmark.theme_key}>
              <div className="external-benchmark-heading"><span>{formatLabel(benchmark.external_sentiment)}</span><strong>{Math.round(benchmark.confidence * 100)}%</strong></div>
              <h3>{benchmark.theme}</h3>
              <p>{formatBenchmarkClassification(benchmark.classification)}</p>
              <p>{benchmark.recommended_action}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="marketing-grid">
        <section className="marketing-panel">
          <h2>Five-persona breakdown</h2>
          <div className="persona-signal-list">
            {requiredPersonas.map((persona) => (
              <div className={badgeToneClass(persona)} key={persona}><span>{persona}</span><strong>{livePersonaCounts[persona] ?? 0}</strong></div>
            ))}
          </div>
        </section>
        <section className="marketing-panel">
          <h2>Live demo signals</h2>
          {liveGapThemes.map(([theme, count]) => (
            <article className="signal-card market-signal-card tone-warning" key={theme}>
              <div className="signal-card-header"><strong>{theme}</strong><span className="signal-metric">{count} signal{count === 1 ? "" : "s"}</span></div>
              <p>Recommended action: add product-page proof points and FAQ copy before using this claim in campaigns.</p>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function ApprovalsTabView({
  approvalDraft,
  approvalNote,
  approvalReasonCodes,
  approvalCustomReasonCode,
  approvalFactualCorrections,
  approvalQueue,
  loadingAction,
  onApprove,
  onDraftChange,
  onFactualCorrectionsChange,
  onNoteChange,
  onReasonCodesChange,
  onCustomReasonCodeChange,
  onSelect,
  selectedApproval,
}: {
  approvalDraft: string;
  approvalNote: string;
  approvalReasonCodes: string[];
  approvalCustomReasonCode: string;
  approvalFactualCorrections: boolean;
  approvalQueue: AdhocEnquiryRecord[];
  loadingAction: string | null;
  onApprove: (status: "approved" | "rejected") => void;
  onDraftChange: (value: string) => void;
  onFactualCorrectionsChange: (value: boolean) => void;
  onNoteChange: (value: string) => void;
  onReasonCodesChange: (value: string[]) => void;
  onCustomReasonCodeChange: (value: string) => void;
  onSelect: (id: string) => void;
  selectedApproval: AdhocEnquiryRecord | null;
}) {
  return (
    <section className="workspace-view queue-view approvals-view" aria-labelledby="approvals-heading">
      <QueueList
        emptyLabel="No answerable demo drafts yet."
        items={approvalQueue}
        selectedId={selectedApproval?.enquiry_id ?? ""}
        title="Approval Queue"
        onSelect={onSelect}
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
              <InfoBlock label="Routing Guardrail" text={selectedApproval.classification.routing_reason} />
            </div>
            <label className="field-stack">
              <span>Draft Reply</span>
              <textarea onChange={(event) => onDraftChange(event.target.value)} value={approvalDraft} />
            </label>
            <label className="field-stack">
              <span>Reviewer Note</span>
              <input onChange={(event) => onNoteChange(event.target.value)} placeholder="Optional note" value={approvalNote} />
            </label>
            <div className="info-block approvals-telemetry-row">
              <span>Review Telemetry (optional)</span>
              <div className="approvals-telemetry-options">
                {reviewReasonOptions.map((option) => (
                  <label
                    className={approvalReasonCodes.includes(option.code) ? "approvals-telemetry-chip active" : "approvals-telemetry-chip"}
                    key={option.code}
                  >
                    <input
                      checked={approvalReasonCodes.includes(option.code)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          onReasonCodesChange([...approvalReasonCodes, option.code]);
                        } else {
                          onReasonCodesChange(approvalReasonCodes.filter((code) => code !== option.code));
                        }
                      }}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <label className={approvalFactualCorrections ? "approvals-telemetry-chip active" : "approvals-telemetry-chip"}>
                  <input
                    checked={approvalFactualCorrections}
                    onChange={(event) => onFactualCorrectionsChange(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Factual corrections made</span>
                </label>
              </div>
              <label className="field-stack">
                <span>Custom reason code</span>
                <input
                  onChange={(event) => onCustomReasonCodeChange(event.target.value)}
                  placeholder="optional_custom_code"
                  value={approvalCustomReasonCode}
                />
              </label>
            </div>
            <div className="action-row">
              <button className="primary-action" disabled={loadingAction !== null || selectedApproval.state === "approved"} onClick={() => onApprove("approved")} type="button">Approve</button>
              <button className="danger-action" disabled={loadingAction !== null} onClick={() => onApprove("rejected")} type="button">Reject</button>
            </div>
            <ClaimEvidenceFlowMap record={selectedApproval} />
            <EvidenceGrid record={selectedApproval} />
          </>
        ) : (
          <EmptyPanel title="No pending approvals" text="Answerable demo enquiries will appear here." />
        )}
      </div>
    </section>
  );
}

function CsQueueTabView({
  gapNote,
  gapQueue,
  gapResolution,
  loadingAction,
  onCloseGap,
  onDraftKbEntry,
  onGapNoteChange,
  onGapResolutionChange,
  onResolveGap,
  onSelect,
  selectedGap,
}: {
  gapNote: string;
  gapQueue: AdhocEnquiryRecord[];
  gapResolution: string;
  loadingAction: string | null;
  onCloseGap: () => void;
  onDraftKbEntry: () => void;
  onGapNoteChange: (value: string) => void;
  onGapResolutionChange: (value: string) => void;
  onResolveGap: () => void;
  onSelect: (id: string) => void;
  selectedGap: AdhocEnquiryRecord | null;
}) {
  return (
    <section className="workspace-view queue-view cs-queue-view" aria-labelledby="cs-heading">
      <QueueList emptyLabel="No unresolved demo gaps yet." items={gapQueue} selectedId={selectedGap?.enquiry_id ?? ""} title="CS Queue" onSelect={onSelect} />
      <div className="queue-detail-panel">
        {selectedGap?.gap_state ? (
          <>
            <PanelHeading eyebrow={`${selectedGap.gap_state.priority} priority`} title={formatLabel(selectedGap.gap_state.gap_theme)} status={formatLabel(selectedGap.gap_state.status)} />
            <SignalRow values={[selectedGap.classification.persona, selectedGap.gap_state.owner, selectedGap.gap_state.product_page_update_needed ? "Product-page gap" : "Support-only gap", selectedGap.gap_state.marketing_signal ? "Marketing signal" : "No marketing flag"]} />
            <div className="detail-grid two">
              <InfoBlock label="Customer Question" text={selectedGap.ticket.message_body} />
              <InfoBlock label="Missing Knowledge" text={selectedGap.gap_state.missing_knowledge} />
              <InfoBlock label="Suggested Next Action" text={selectedGap.gap_state.suggested_next_action} />
              <EvidenceAttemptedBlock
                evidences={selectedGap.retrieval.evidence}
              />
            </div>
            <label className="field-stack"><span>Verified Resolution</span><textarea onChange={(event) => onGapResolutionChange(event.target.value)} value={gapResolution} /></label>
            <label className="field-stack"><span>Resolution Note</span><input onChange={(event) => onGapNoteChange(event.target.value)} placeholder="Optional CS note" value={gapNote} /></label>
            <div className="action-row">
              {selectedGap.gap_state.status === "needs_resolution" ? (
                <button className="secondary-action" disabled={loadingAction !== null || gapResolution.trim().length < 3} onClick={onResolveGap} type="button">Resolve Gap</button>
              ) : (
                <>
                  <button className="primary-action" disabled={loadingAction !== null || !selectedGap.gap_state.human_resolution} onClick={onDraftKbEntry} type="button">Draft KB Entry</button>
                  <button className="secondary-action" disabled={loadingAction !== null} onClick={onCloseGap} type="button">Done</button>
                </>
              )}
            </div>
          </>
        ) : (
          <EmptyPanel title="No CS ticket selected" text="Unanswerable enquiries will route here." />
        )}
      </div>
    </section>
  );
}

function KnowledgeBaseTabView({
  approvedKbAdditions,
  datasetOverview,
  diagnostics,
  enquiries,
  gapQueue,
  kbReviewNote,
  loadingAction,
  onKbReviewNoteChange,
  onReviewKbEntry,
  onSelectGap,
  pendingKbDrafts,
  selectedGap,
}: {
  approvedKbAdditions: AdhocEnquiryRecord[];
  datasetOverview: DatasetOverview;
  diagnostics: DatasetOverview["diagnostics"];
  enquiries: AdhocEnquiryRecord[];
  gapQueue: AdhocEnquiryRecord[];
  kbReviewNote: string;
  loadingAction: string | null;
  onKbReviewNoteChange: (value: string) => void;
  onReviewKbEntry: (status: "approved" | "rejected") => void;
  onSelectGap: (id: string) => void;
  pendingKbDrafts: AdhocEnquiryRecord[];
  selectedGap: AdhocEnquiryRecord | null;
}) {
  return (
    <section className="workspace-view kb-view" aria-labelledby="kb-heading">
      <div className="knowledge-summary">
        <PanelHeading eyebrow="Knowledge Base" title="Source coverage and generated additions" status={`${diagnostics?.document_chunk_count ?? 0} chunks`} />
        <div className="metric-strip">
          <Metric label="FAQ entries" value={diagnostics?.faq_entry_count ?? 0} />
          <Metric label="Product models" value={diagnostics?.product_model_count ?? 0} />
          <Metric label="Strap SKUs" value={diagnostics?.strap_item_count ?? 0} />
          <Metric label="Demo KB drafts" value={gapQueue.filter((record) => record.gap_state?.kb_draft).length} />
        </div>
        <div className="source-chip-grid">
          {datasetOverview.sources.map((source) => <span key={source.file_name}>{source.file_name} - {source.exists ? "ready" : "missing"}</span>)}
        </div>
      </div>
      <KnowledgeSourceMap
        approvedKbAdditions={approvedKbAdditions}
        datasetOverview={datasetOverview}
        enquiries={enquiries}
        gapRecords={gapQueue}
        pendingKbDrafts={pendingKbDrafts}
      />
      <div className="kb-columns">
        <section className="kb-column">
          <h2>Draft Queue</h2>
          {pendingKbDrafts.length === 0 ? <EmptyPanel title="No generated KB drafts" text="Resolve a CS gap to create a draft." /> : pendingKbDrafts.map((record) => <KBDraftCard key={record.enquiry_id} record={record} selected={selectedGap?.enquiry_id === record.enquiry_id} onSelect={() => onSelectGap(record.enquiry_id)} />)}
        </section>
        <section className="kb-column">
          <h2>Approved Additions</h2>
          {approvedKbAdditions.length === 0 ? <EmptyPanel title="No approved additions yet" text="Approved KB drafts will collect here." /> : approvedKbAdditions.map((record) => <KBDraftCard key={record.enquiry_id} record={record} />)}
        </section>
      </div>
      {selectedGap?.gap_state?.status === "kb_draft_ready" && selectedGap.gap_state.kb_draft ? (
        <div className="kb-review-panel">
          <PanelHeading eyebrow={selectedGap.enquiry_id} title={selectedGap.gap_state.kb_draft.question} status={formatLabel(selectedGap.gap_state.status)} />
          <p>{selectedGap.gap_state.kb_draft.answer}</p>
          <label className="field-stack"><span>KB Review Note</span><input onChange={(event) => onKbReviewNoteChange(event.target.value)} placeholder="Optional KB review note" value={kbReviewNote} /></label>
          <div className="action-row">
            <button className="secondary-action" disabled={loadingAction !== null} onClick={() => onReviewKbEntry("approved")} type="button">Approve KB Draft</button>
            <button className="danger-action" disabled={loadingAction !== null} onClick={() => onReviewKbEntry("rejected")} type="button">Reject KB Draft</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type KBMapNodeKind = "source" | "topic" | "output";

type KBMapNode = {
  id: string;
  kind: KBMapNodeKind;
  label: string;
  metric: string;
  icon: "document" | "table" | "database" | "workflow";
  status: string;
  detail: string;
  detailItems: string[];
  x: number;
  y: number;
};

type KBMapConnection = {
  from: string;
  to: string;
  tone?: "normal" | "warning" | "success";
};

function KnowledgeSourceMap({
  approvedKbAdditions,
  datasetOverview,
  enquiries,
  gapRecords,
  pendingKbDrafts,
}: {
  approvedKbAdditions: AdhocEnquiryRecord[];
  datasetOverview: DatasetOverview;
  enquiries: AdhocEnquiryRecord[];
  gapRecords: AdhocEnquiryRecord[];
  pendingKbDrafts: AdhocEnquiryRecord[];
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const diagnostics = datasetOverview.diagnostics;
  const sourceByTerms = (...terms: string[]) =>
    datasetOverview.sources.find((source) => {
      const haystack = `${source.file_name} ${source.source_type} ${source.role}`.toLowerCase();
      return terms.every((term) => haystack.includes(term.toLowerCase()));
    });
  const sourceDetail = (source: DatasetOverview["sources"][number] | undefined) => ({
    status: source?.exists ? "Ready" : "Missing",
    items: [
      source?.file_name ?? "Generated demo artifact",
      source?.role ? formatLabel(source.role) : "Built from approved CS resolutions",
      source?.source_type ? formatLabel(source.source_type) : "Demo knowledge addition",
    ],
  });
  const gapText = (record: AdhocEnquiryRecord) =>
    `${record.ticket.subject} ${record.ticket.message_body} ${record.gap_state?.gap_theme ?? ""}`.toLowerCase();
  const shippingGaps = gapRecords.filter((record) =>
    /shipping|order|delivery|courier|tracking|refund/.test(gapText(record)),
  );
  const sustainabilityGaps = gapRecords.filter((record) =>
    /carbon|neutral|recycling|sustainability|vegan|material/.test(gapText(record)),
  );
  const customerVisibleReplies = enquiries.filter((record) => record.customer_visible_response);

  const faqSource = sourceDetail(sourceByTerms("faq"));
  const productSource = sourceDetail(sourceByTerms("product", "reference"));
  const sopSource = sourceDetail(sourceByTerms("sop"));
  const engravingSource = sourceDetail(sourceByTerms("engraving"));
  const servicingSource = sourceDetail(sourceByTerms("servicing"));

  const nodes: KBMapNode[] = [
    {
      id: "faq",
      kind: "source",
      label: "FAQ Document",
      metric: `${diagnostics?.faq_entry_count ?? 0} entries`,
      icon: "document",
      status: faqSource.status,
      detail: "Customer-facing wording and existing support coverage.",
      detailItems: faqSource.items,
      x: 70,
      y: 48,
    },
    {
      id: "product_ref",
      kind: "source",
      label: "Product Reference",
      metric: `${diagnostics?.product_model_count ?? 0} models`,
      icon: "document",
      status: productSource.status,
      detail: "Authoritative product specs, safety, strap, and availability facts.",
      detailItems: productSource.items,
      x: 70,
      y: 146,
    },
    {
      id: "sop",
      kind: "source",
      label: "Support SOP",
      metric: `${diagnostics?.document_chunk_count ?? 0} chunks`,
      icon: "document",
      status: sopSource.status,
      detail: "Routing, tone, escalation, and approval process guidance.",
      detailItems: sopSource.items,
      x: 70,
      y: 244,
    },
    {
      id: "engraving_rate",
      kind: "source",
      label: "Engraving Rate Card",
      metric: `${diagnostics?.engraving_rate_card_count ?? 0} rules`,
      icon: "table",
      status: engravingSource.status,
      detail: "Authoritative engraving prices, character limits, and turnaround rules.",
      detailItems: engravingSource.items,
      x: 70,
      y: 342,
    },
    {
      id: "servicing_rate",
      kind: "source",
      label: "Servicing Rate Card",
      metric: `${diagnostics?.servicing_rate_card_count ?? 0} rules`,
      icon: "table",
      status: servicingSource.status,
      detail: "Authoritative servicing scope, price, and turnaround rules.",
      detailItems: servicingSource.items,
      x: 70,
      y: 440,
    },
    {
      id: "approved_additions",
      kind: "source",
      label: "Approved Additions",
      metric: `${approvedKbAdditions.length} approved`,
      icon: "database",
      status: approvedKbAdditions.length > 0 ? "Growing" : "Empty",
      detail: "Human-approved FAQ additions generated from resolved CS gaps.",
      detailItems: approvedKbAdditions.length
        ? approvedKbAdditions.map((record) => record.gap_state?.kb_draft?.question ?? record.ticket.subject).slice(0, 3)
        : ["No approved demo additions yet"],
      x: 70,
      y: 538,
    },
    {
      id: "product_specs",
      kind: "topic",
      label: "Product Specs",
      metric: `${diagnostics?.product_model_count ?? 0} models`,
      icon: "workflow",
      status: "Covered",
      detail: "Model, SKU, compatibility, and availability questions draw from product references.",
      detailItems: ["Product reference", "FAQ wording", "Evidence cards in approvals"],
      x: 440,
      y: 76,
    },
    {
      id: "strap_materials",
      kind: "topic",
      label: "Strap & Material Safety",
      metric: `${diagnostics?.strap_item_count ?? 0} strap SKUs`,
      icon: "workflow",
      status: "Covered",
      detail: "Safety, BPA, strap material, and compatibility answers are grounded in product data.",
      detailItems: ["Product reference", "FAQ document", "Health-conscious buyer signals"],
      x: 440,
      y: 176,
    },
    {
      id: "engraving",
      kind: "topic",
      label: "Engraving",
      metric: `${diagnostics?.engraving_rate_card_count ?? 0} rules`,
      icon: "workflow",
      status: "Authoritative",
      detail: "Pricing and hard limits come from the engraving rate card.",
      detailItems: ["Rate card priority source", "Gift workflow", "Character and timing rules"],
      x: 440,
      y: 276,
    },
    {
      id: "servicing",
      kind: "topic",
      label: "Servicing",
      metric: `${diagnostics?.servicing_rate_card_count ?? 0} rules`,
      icon: "workflow",
      status: "Authoritative",
      detail: "Service scope, pricing, and turnaround rely on the servicing rate card.",
      detailItems: ["Rate card priority source", "Escalation-sensitive answers", "CS review when stale"],
      x: 440,
      y: 376,
    },
    {
      id: "shipping_policy",
      kind: "topic",
      label: "Shipping & Order Policy",
      metric: `${shippingGaps.length} live gaps`,
      icon: "workflow",
      status: shippingGaps.length > 0 ? "Needs CS" : "Monitored",
      detail: "Order-specific or missing policy cases route to CS rather than static KB answers.",
      detailItems: ["SOP routing", "FAQ policy wording", "Shopify lookup later"],
      x: 440,
      y: 476,
    },
    {
      id: "sustainability",
      kind: "topic",
      label: "Sustainability Signals",
      metric: `${sustainabilityGaps.length} live gaps`,
      icon: "workflow",
      status: sustainabilityGaps.length > 0 ? "Emerging" : "Monitored",
      detail: "Carbon-neutral, vegan, recycling, and material questions become product-page and KB signals.",
      detailItems: sustainabilityGaps.length
        ? sustainabilityGaps.map((record) => record.gap_state?.gap_theme ?? record.ticket.subject).slice(0, 3)
        : ["No live sustainability gap in this session"],
      x: 440,
      y: 576,
    },
    {
      id: "reply_output",
      kind: "output",
      label: "Evidence-backed Replies",
      metric: `${customerVisibleReplies.length} released`,
      icon: "database",
      status: "Human-gated",
      detail: "Supported answers become customer-visible only after approval or verified CS resolution.",
      detailItems: ["Approval queue", "Customer Chat response", "Grounding guardrails"],
      x: 810,
      y: 124,
    },
    {
      id: "gap_output",
      kind: "output",
      label: "CS Gap Routing",
      metric: `${gapRecords.length} records`,
      icon: "database",
      status: "No hallucination",
      detail: "Unsupported or order-specific questions are routed for human confirmation.",
      detailItems: ["Missing knowledge", "Owner and priority", "Evidence attempted"],
      x: 810,
      y: 284,
    },
    {
      id: "draft_output",
      kind: "output",
      label: "Draft KB Updates",
      metric: `${pendingKbDrafts.length} pending`,
      icon: "database",
      status: "Reviewable",
      detail: "Resolved gaps can become draft FAQ entries when the answer is reusable.",
      detailItems: pendingKbDrafts.length
        ? pendingKbDrafts.map((record) => record.gap_state?.kb_draft?.question ?? record.ticket.subject).slice(0, 3)
        : ["No pending KB drafts"],
      x: 810,
      y: 444,
    },
  ];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const connections: KBMapConnection[] = [
    { from: "faq", to: "product_specs" },
    { from: "faq", to: "shipping_policy" },
    { from: "product_ref", to: "product_specs" },
    { from: "product_ref", to: "strap_materials" },
    { from: "product_ref", to: "sustainability" },
    { from: "sop", to: "shipping_policy", tone: "warning" },
    { from: "sop", to: "gap_output", tone: "warning" },
    { from: "engraving_rate", to: "engraving" },
    { from: "servicing_rate", to: "servicing" },
    { from: "approved_additions", to: "sustainability", tone: "success" },
    { from: "product_specs", to: "reply_output" },
    { from: "strap_materials", to: "reply_output" },
    { from: "engraving", to: "reply_output" },
    { from: "servicing", to: "reply_output" },
    { from: "shipping_policy", to: "gap_output", tone: "warning" },
    { from: "sustainability", to: "draft_output", tone: "success" },
  ];

  return (
    <section className="kb-source-map" aria-labelledby="kb-source-map-heading">
      <div className="kb-source-map-header">
        <div>
          <h2 id="kb-source-map-heading" className="deliverable-eyebrow">KB Topology</h2>
        </div>
        <span className="status-pill">{datasetOverview.sources.filter((source) => source.exists).length} sources ready</span>
      </div>
      <div className="kb-source-map-canvas">
        <div className="kb-source-map-plane">
          <svg aria-hidden="true" viewBox="0 0 1080 690">
            {connections.map((connection) => {
              const from = nodeById.get(connection.from);
              const to = nodeById.get(connection.to);
              if (!from || !to) {
                return null;
              }
              const fromX = from.x + 260;
              const fromY = from.y + 35;
              const toX = to.x;
              const toY = to.y + 35;
              const path = `M ${fromX} ${fromY} C ${fromX + 90} ${fromY}, ${toX - 90} ${toY}, ${toX} ${toY}`;
              return (
                <path
                  className={`kb-source-line ${connection.tone ?? "normal"}`}
                  d={path}
                  key={`${connection.from}-${connection.to}`}
                />
              );
            })}
          </svg>
          {nodes.map((node) => (
            <button
              className={`kb-map-node ${node.kind} ${selectedNode?.id === node.id ? "active" : ""}`}
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              style={{ left: node.x, top: node.y }}
              type="button"
            >
              {node.kind === "output" ? null : (
                <span className="kb-map-node-icon">
                  <KBMapIcon icon={node.icon} />
                </span>
              )}
              <span className="kb-map-node-kind">{formatLabel(node.kind)}</span>
              <strong className="kb-map-node-label">{node.label}</strong>
              <small className="kb-map-node-metric">{node.metric}</small>
            </button>
          ))}
        </div>
        {selectedNode ? (
          <aside className={`kb-map-detail-popover ${selectedNode.kind}`}>
            <button
              aria-label="Close KB node details"
              className="kb-map-popover-close"
              onClick={() => setSelectedNodeId(null)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <span>{formatLabel(selectedNode.kind)} · {selectedNode.status}</span>
            <h3>{selectedNode.label}</h3>
            <p>{selectedNode.detail}</p>
            <div className="kb-map-detail-list">
              {selectedNode.detailItems.map((item, index) => (
                <div key={`${selectedNode.id}-${item}-${index}`}>{item}</div>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function KBMapIcon({ icon }: { icon: KBMapNode["icon"] }) {
  if (icon === "table") {
    return <Table2 aria-hidden="true" />;
  }
  if (icon === "database") {
    return <Database aria-hidden="true" />;
  }
  if (icon === "workflow") {
    return <Workflow aria-hidden="true" />;
  }
  return <FileText aria-hidden="true" />;
}

function SystemTabView({
  enquiries,
  initialGapMetrics,
  initialGaps,
  systemDetails,
  workflowStatus,
}: {
  enquiries: AdhocEnquiryRecord[];
  initialGapMetrics: GapMetrics | null;
  initialGaps: KnowledgeGapRecord[];
  systemDetails: ReactNode;
  workflowStatus: WorkflowOverview["statusReport"];
}) {
  const failureModeCounts = enquiries.reduce<Record<string, number>>((acc, record) => {
    for (const mode of record.draft.failure_modes ?? []) {
      acc[mode] = (acc[mode] ?? 0) + 1;
    }
    return acc;
  }, {});
  return (
    <section className="workspace-view system-details-view">
      <div className="system-summary-bar">
        <span>{workflowStatus?.stable_endpoint_count ?? 0} stable endpoints</span>
        <span>{initialGaps.length} dataset gaps</span>
        <span>{initialGapMetrics?.product_page_update_needed_count ?? 0} product-page gaps</span>
      </div>
      <div className="system-details-content">{systemDetails}</div>
      <section className="marketing-panel">
        <h2>Responsible AI Diagnostics</h2>
        <div className="persona-signal-list">
          {Object.entries(failureModeCounts).length === 0 ? (
            <span className="tone-neutral">No active failure modes detected in current demo session.</span>
          ) : (
            Object.entries(failureModeCounts).map(([mode, count]) => (
              <div className="tone-warning" key={mode}>
                <span>{formatLabel(mode)}</span>
                <strong>{count}</strong>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

function ClaimEvidenceFlowMap({ record }: { record: AdhocEnquiryRecord }) {
  const claims = record.draft.claim_verification ?? [];
  if (claims.length === 0) {
    return null;
  }
  const evidenceNodeMap = new Map<string, { source: string; snippet: string }>();
  claims.forEach((claim) => {
    claim.evidence_links.forEach((link) => {
      if (!evidenceNodeMap.has(link.evidence_id)) {
        evidenceNodeMap.set(link.evidence_id, {
          source: link.source_file,
          snippet: link.snippet,
        });
      }
    });
  });
  const evidenceNodes = [...evidenceNodeMap.entries()];
  const evidenceIndexById = new Map<string, number>();
  evidenceNodes.forEach(([evidenceId], index) => evidenceIndexById.set(evidenceId, index));

  const width = 1100;
  const leftX = 220;
  const rightX = 860;
  const topPadding = 40;
  const leftGap = 88;
  const rightGap = 112;
  const leftY = (index: number) => topPadding + index * leftGap;
  const rightY = (index: number) => topPadding + index * rightGap;
  const canvasHeight = Math.max(
    220,
    topPadding * 2 + Math.max((evidenceNodes.length - 1) * leftGap, (claims.length - 1) * rightGap),
  );

  function wrapText(text: string, maxCharsPerLine: number, maxLines: number) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxCharsPerLine) {
        current = candidate;
        continue;
      }
      if (current) {
        lines.push(current);
      }
      current = word;
      if (lines.length === maxLines) {
        break;
      }
    }
    if (lines.length < maxLines && current) {
      lines.push(current);
    }
    if (lines.length > maxLines) {
      lines.length = maxLines;
    }
    if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.]{3}$/, "")}...`;
    }
    return lines;
  }

  return (
    <section className="approvals-flow-map">
      <h3>Claim-to-Evidence Map</h3>
      <p className="muted-copy">
        Flowchart view: evidence nodes on the left feed claim nodes on the right.
      </p>
      <div className="approvals-flow-canvas">
        <svg aria-label="Claim to evidence flow diagram" role="img" viewBox={`0 0 ${width} ${canvasHeight}`}>
          {claims.map((claim, claimIndex) =>
            claim.evidence_links.map((link, linkIndex) => {
              const sourceIndex = evidenceIndexById.get(link.evidence_id);
              if (sourceIndex === undefined) {
                return null;
              }
              const x1 = leftX + 170;
              const y1 = leftY(sourceIndex);
              const x2 = rightX - 170;
              const y2 = rightY(claimIndex);
              const path = `M ${x1} ${y1} C ${x1 + 120} ${y1}, ${x2 - 120} ${y2}, ${x2} ${y2}`;
              return (
                <path
                  className={claim.verdict === "contradicted" ? "approvals-flow-line risk" : "approvals-flow-line"}
                  d={path}
                  key={`${link.evidence_id}-${claimIndex}-${linkIndex}`}
                />
              );
            }),
          )}
          {evidenceNodes.map(([evidenceId, meta], index) => (
            <g key={evidenceId} transform={`translate(${leftX - 170}, ${leftY(index) - 30})`}>
              <rect className="approvals-flow-node evidence" height="60" rx="10" width="340" x="0" y="0" />
              <g className="approvals-flow-doc-icon" transform="translate(12, 14)">
                <path d="M2 0h14l4 4v18H2z" />
                <path d="M16 0v4h4" />
              </g>
              <text className="approvals-flow-node-title" x="44" y="24">
                {evidenceId}
              </text>
              <text className="approvals-flow-node-subtitle" x="44" y="44">
                {meta.source}
              </text>
            </g>
          ))}
          {claims.map((claim, index) => (
            <g key={`${claim.sentence}-${index}`} transform={`translate(${rightX - 170}, ${rightY(index) - 40})`}>
              <rect className={`approvals-flow-node claim ${claim.verdict === "contradicted" ? "risk" : ""}`} height="80" rx="10" width="340" x="0" y="0" />
              <text className="approvals-flow-node-title" x="12" y="24">
                {formatLabel(claim.verdict)} · {formatLabel(claim.sentence_type)}
              </text>
              <text className="approvals-flow-node-subtitle" x="12" y="46">
                {wrapText(claim.sentence, 54, 2).map((line, lineIndex) => (
                  <tspan dy={lineIndex === 0 ? 0 : 14} key={`${line}-${lineIndex}`} x="12">
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
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
  if (record.state === "gap_resolved") {
    return "Verified CS response released. The team can decide whether this should become reusable KB content.";
  }
  if (record.state === "gap_closed") {
    return "Verified CS response released. This case was closed without a KB draft.";
  }
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

function EvidenceAttemptedBlock({
  evidences,
}: {
  evidences: AdhocEnquiryRecord["retrieval"]["evidence"];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalized =
    evidences[0]?.excerpt?.trim() ?? "No local evidence produced a definitive answer.";
  const previewLimit = 240;
  const preview =
    normalized.length > previewLimit ? `${normalized.slice(0, previewLimit)}...` : normalized;
  const sourceFiles = Array.from(
    new Set(
      evidences
        .map((evidence) => evidence.source_file.trim())
        .filter((name) => name.length > 0),
    ),
  );
  const parsedRows = parseEvidenceTableRows(normalized);

  return (
    <>
      <button
        className="info-block evidence-attempt-block"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Maximize2 aria-hidden="true" className="evidence-open-icon" size={14} />
        <span>Evidence Attempted</span>
        <p>{preview}</p>
        {sourceFiles.length > 0 ? (
          <div className="evidence-source-files">
            {sourceFiles.map((file) => (
              <em key={file}>{file}</em>
            ))}
          </div>
        ) : null}
      </button>
      {isOpen ? (
        <div
          aria-modal="true"
          className="evidence-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="dialog"
        >
          <div className="evidence-modal" onClick={(event) => event.stopPropagation()}>
            <div className="evidence-modal-header">
              <strong>Evidence Attempted</strong>
              <button
                className="evidence-modal-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            {parsedRows.length > 0 ? (
              <div className="evidence-modal-table-wrap">
                <table className="evidence-modal-table">
                  <tbody>
                    {parsedRows.map((row, rowIndex) => (
                      <tr key={`${rowIndex}-${row.join("|")}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="evidence-modal-raw">
              <span>Full excerpt</span>
              <p>{normalized}</p>
            </div>

            {sourceFiles.length > 0 ? (
              <div className="evidence-source-files">
                {sourceFiles.map((file) => (
                  <em key={file}>{file}</em>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function parseEvidenceTableRows(text: string): string[][] {
  const tokens = text
    .split("|")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length < 4) {
    return [];
  }

  const rows: string[][] = [];
  let current: string[] = [];
  for (const token of tokens) {
    const isRowStart = /^(yes|no)$/i.test(token);
    if (isRowStart && current.length > 0) {
      rows.push(current);
      current = [token];
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) {
    rows.push(current);
  }

  if (rows.length <= 1) {
    const chunkSize = 4;
    const chunked: string[][] = [];
    for (let index = 0; index < tokens.length; index += chunkSize) {
      chunked.push(tokens.slice(index, index + chunkSize));
    }
    return chunked;
  }

  return rows;
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
