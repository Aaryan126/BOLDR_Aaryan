export type BackendHealth = {
  status: "ok" | "unavailable";
  app?: string;
  phase?: string;
  detail?: string;
};

export type DatasetDiagnostics = {
  expected_brief_file_count: number;
  actual_source_file_count: number;
  warning: string | null;
  missing_files: string[];
  ticket_count: number;
  answered_by_kb_counts: Record<string, number>;
  requires_escalation_counts: Record<string, number>;
  question_type_counts: Record<string, number>;
  buyer_persona_counts: Record<string, number>;
  channel_counts: Record<string, number>;
  status_counts: Record<string, number>;
  engraving_rate_card_count: number;
  servicing_rate_card_count: number;
  document_section_count: number;
  document_chunk_count: number;
  faq_entry_count: number;
  product_model_count: number;
  strap_item_count: number;
  source_priorities: Record<string, number>;
};

export type DatasetSource = {
  file_name: string;
  relative_path: string;
  source_type: string;
  source_priority: number;
  role: string;
  exists: boolean;
  size_bytes: number | null;
};

export type DatasetOverview = {
  diagnostics: DatasetDiagnostics | null;
  sources: DatasetSource[];
  status: "ok" | "unavailable";
  detail?: string;
};

export type ClassificationEvaluation = {
  total_tickets: number;
  classified_tickets: number;
  required_persona_counts: Record<string, number>;
  csv_persona_counts: Record<string, number>;
  answerability_counts: Record<string, number>;
  operational_tag_counts: Record<string, number>;
  question_type_counts: Record<string, number>;
  order_lookup_required_count: number;
  knowledge_gap_count: number;
  needs_human_review_count: number;
  escalation_matches_csv: number;
  escalation_accuracy: number;
  answerability_matches_csv: number;
  answerability_label_accuracy: number;
  final_personas: string[];
  exposes_transactional_persona: boolean;
  tricky_case_ticket_ids: string[];
};

export type ClassificationOverview = {
  evaluation: ClassificationEvaluation | null;
  status: "ok" | "unavailable";
  detail?: string;
};

export type RetrievalEvaluation = {
  total_tickets: number;
  answerable_ticket_count: number;
  answerable_with_evidence_count: number;
  known_unsupported_ticket_count: number;
  known_unsupported_blocked_count: number;
  golden_query_count: number;
  golden_query_pass_count: number;
  conflict_warning_count: number;
  source_priority_checks_passed: boolean;
  search_methods: string[];
};

export type RetrievalOverview = {
  evaluation: RetrievalEvaluation | null;
  status: "ok" | "unavailable";
  detail?: string;
};

export type AIProviderStatus = {
  provider: string;
  model: string;
  base_url: string;
  configured: boolean;
  live_enabled: boolean;
  timeout_seconds: number;
  max_retries: number;
  prompt_redaction_enabled: boolean;
  structured_schema_count: number;
};

export type AIOverview = {
  statusReport: AIProviderStatus | null;
  status: "ok" | "unavailable";
  detail?: string;
};

export type DraftEvaluation = {
  total_tickets: number;
  generated_ticket_count: number;
  customer_reply_count: number;
  holding_reply_count: number;
  internal_note_count: number;
  answerable_draft_count: number;
  blocked_unsupported_count: number;
  order_lookup_note_count: number;
  guardrail_failures_count: number;
  evidence_backed_customer_reply_count: number;
  approval_status_counts: Record<string, number>;
};

export type DraftOverview = {
  evaluation: DraftEvaluation | null;
  status: "ok" | "unavailable";
  detail?: string;
};

export type WorkflowStatusReport = {
  phase: string;
  stable_endpoint_count: number;
  ticket_count: number;
  draft_count: number;
  gap_count: number;
  process_run_count: number;
  approval_queue_count: number;
  unresolved_gap_count: number;
  kb_draft_ready_count: number;
  approved_gap_count: number;
  rejected_gap_count: number;
  supported_review_actions: string[];
};

export type WorkflowOverview = {
  statusReport: WorkflowStatusReport | null;
  status: "ok" | "unavailable";
  detail?: string;
};

export type ThemeEvidence = {
  ticket_id: string;
  subject: string;
  persona: string;
  answerability: string;
  customer_wording: string;
};

export type ThemeRadarItem = {
  theme_name: string;
  frequency: number;
  trend_direction: "rising" | "stable" | "falling";
  representative_ticket_ids: string[];
  common_customer_wording: string[];
  answerability_breakdown: Record<string, number>;
  persona_breakdown: Record<string, number>;
  recommended_kb_action: string;
  recommended_marketing_action: string;
  product_page_gap: boolean;
  marketing_signal: boolean;
  gap_count: number;
  evidence: ThemeEvidence[];
};

export type ThemeRadarResponse = {
  status: "ok";
  data: ThemeRadarItem[];
  meta: {
    total_ticket_count: number;
    clustered_ticket_count: number;
    theme_count: number;
    generated_at: string;
  };
};

export type MarketingOpportunity = {
  theme_name: string;
  persona_focus: string[];
  insight: string;
  recommended_action: string;
  campaign_angle: string;
  evidence_ticket_ids: string[];
  product_page_update_needed: boolean;
};

export type MarketingBrief = {
  brief_id: string;
  period_label: string;
  generated_at: string;
  source_ticket_count: number;
  theme_count: number;
  markdown: string;
  opportunities: MarketingOpportunity[];
};

export type MarketingBriefResponse = {
  status: "ok";
  data: MarketingBrief;
};

export type InsightsOverview = {
  themeRadar: ThemeRadarResponse | null;
  marketingBrief: MarketingBrief | null;
  status: "ok" | "unavailable";
  detail?: string;
};

export type ReplyType = "customer_reply" | "holding_reply" | "internal_note";

export type ApprovalStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "edited_and_approved"
  | "rejected"
  | "sent_or_exported";

export type TicketWorkflowSummary = {
  ticket_id: string;
  date_received: string;
  subject: string;
  channel: string;
  status: string;
  persona: string;
  intent: string;
  answerability: string;
  reply_type: ReplyType;
  approval_status: ApprovalStatus;
  requires_escalation: boolean;
  evidence_count: number;
  guardrail_failures: number;
  gap_id: string | null;
};

export type TicketRecord = {
  ticket_id: string;
  date_received: string;
  customer_name: string;
  customer_email: string;
  order_id: string | null;
  channel: string;
  question_type: string;
  subject: string;
  message_body: string;
  status: string;
  answered_by_kb: boolean;
  requires_escalation: boolean;
  buyer_persona: string;
  agent_notes: string | null;
};

export type TicketClassificationDetail = {
  ticket_id: string;
  question_text: string;
  channel: string;
  intent: string;
  question_type_hints: string[];
  persona: string;
  persona_confidence: number;
  persona_trigger_terms: string[];
  persona_reasoning: string;
  operational_tags: string[];
  answerability: string;
  requires_escalation: boolean;
  routing_reason: string;
  extracted_order_ids: string[];
  extracted_tracking_ids: string[];
};

export type EvidenceCard = {
  evidence_id: string;
  source_file: string;
  source_type: string;
  source_priority: number;
  section_title: string;
  match_type: string;
  score: number;
  confidence: number;
  matched_terms: string[];
  excerpt: string;
  supports_answer: boolean;
};

export type RetrievalDetail = {
  query: string;
  ticket_id: string | null;
  answerability_hint: string | null;
  sufficient_evidence: boolean;
  insufficiency_reason: string | null;
  unsupported_terms: string[];
  evidence: EvidenceCard[];
  conflict_warnings: Array<{
    topic: string;
    message: string;
    authoritative_source: string;
    lower_priority_sources: string[];
  }>;
};

export type TicketDraftDetail = {
  ticket_id: string;
  persona: string;
  intent: string;
  decision: {
    ticket_id: string;
    answerability: string;
    reply_type: ReplyType;
    customer_facing: boolean;
    can_send_to_customer: boolean;
    evidence_sufficient: boolean;
    judge_method: string;
    reasons: string[];
    required_human_inputs: string[];
    unsupported_terms: string[];
  };
  evidence_sufficiency: {
    sufficient_evidence: boolean;
    confidence: number;
    supported_claims: string[];
    unsupported_claims: string[];
    required_human_inputs: string[];
    rationale: string;
  };
  draft: {
    reply_type: ReplyType;
    draft_reply: string;
    evidence_ids: string[];
    claims: string[];
    approval_status: "draft" | "needs_review";
  };
  gap_record: {
    ticket_id: string;
    gap_theme: string;
    gap_question: string;
    owner: string;
    priority: "low" | "medium" | "high";
    evidence_summary: string;
    suggested_next_action: string;
  } | null;
  evidence_trace: Array<{
    evidence_id: string;
    source_file: string;
    source_type: string;
    section_title: string;
    excerpt: string;
    supports_answer: boolean;
  }>;
  guardrails: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  approval: {
    status: ApprovalStatus;
    reviewer_note: string | null;
    edited_reply: string | null;
  };
};

export type TicketWorkflowDetail = {
  workflow: TicketWorkflowSummary;
  ticket: TicketRecord;
  classification: TicketClassificationDetail;
  retrieval: RetrievalDetail;
  draft: TicketDraftDetail;
};

export type TicketListResponse = {
  status: "ok";
  data: TicketWorkflowSummary[];
  meta: {
    total: number;
    returned: number;
    filters: Record<string, string>;
    answerability_counts: Record<string, number>;
    reply_type_counts: Record<string, number>;
    approval_status_counts: Record<string, number>;
  };
};

export type TicketDetailResponse = {
  status: "ok";
  data: TicketWorkflowDetail;
};

export type GapStatus =
  | "new"
  | "needs_human_answer"
  | "awaiting_supplier"
  | "resolved_needs_kb_draft"
  | "kb_draft_ready"
  | "approved"
  | "rejected";

export type KnowledgeGapRecord = {
  gap_id: string;
  gap_theme: string;
  status: GapStatus;
  source_ticket_ids: string[];
  frequency: number;
  persona_counts: Record<string, number>;
  owner: string;
  priority: "low" | "medium" | "high";
  gap_questions: string[];
  evidence_summary: string;
  suggested_next_action: string;
  suggested_faq_section: string;
  product_page_update_needed: boolean;
  marketing_signal: boolean;
  human_resolution: string | null;
  reviewer_note: string | null;
  kb_draft: {
    gap_theme: string;
    faq_section: string;
    question: string;
    answer: string;
    source_ticket_ids: string[];
    confidence: number;
    reviewer_notes: string;
  } | null;
  kb_review_note: string | null;
  kb_reviewed_at: string | null;
  updated_at: string | null;
};

export type GapListResponse = {
  status: "ok";
  data: KnowledgeGapRecord[];
  meta: {
    total: number;
    returned: number;
    filters: Record<string, string>;
    status_counts: Record<string, number>;
    priority_counts: Record<string, number>;
  };
};

export type GapDetailResponse = {
  status: "ok";
  data: KnowledgeGapRecord;
};

export type GapThemeMetric = {
  gap_id: string;
  gap_theme: string;
  frequency: number;
  priority: "low" | "medium" | "high";
  status: GapStatus;
  marketing_signal: boolean;
  product_page_update_needed: boolean;
};

export type GapMetrics = {
  total_gaps: number;
  unresolved_gap_count: number;
  kb_draft_ready_count: number;
  approved_count: number;
  rejected_count: number;
  product_page_update_needed_count: number;
  marketing_signal_count: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_owner: Record<string, number>;
  by_persona: Record<string, number>;
  top_themes: GapThemeMetric[];
};

export type GapMetricsResponse = {
  status: "ok";
  data: GapMetrics;
};

export async function getBackendHealth(): Promise<BackendHealth> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        detail: `Health check returned ${response.status}`,
      };
    }

    return (await response.json()) as BackendHealth;
  } catch (error) {
    return {
      status: "unavailable",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getTicketList(): Promise<TicketListResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/tickets`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TicketListResponse;
  } catch {
    return null;
  }
}

export async function getTicketDetail(
  ticketId: string,
): Promise<TicketWorkflowDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/tickets/${ticketId}/intelligence`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as TicketDetailResponse;
    return body.data;
  } catch {
    return null;
  }
}

export async function getGapList(): Promise<GapListResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/gaps`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GapListResponse;
  } catch {
    return null;
  }
}

export async function getGapMetrics(): Promise<GapMetricsResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/gaps/metrics`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GapMetricsResponse;
  } catch {
    return null;
  }
}

export async function getDatasetOverview(): Promise<DatasetOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const [diagnosticsResponse, sourcesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/datasets/diagnostics`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/datasets/sources`, { cache: "no-store" }),
    ]);

    if (!diagnosticsResponse.ok || !sourcesResponse.ok) {
      return {
        status: "unavailable",
        diagnostics: null,
        sources: [],
        detail: "Dataset diagnostics endpoint is unavailable.",
      };
    }

    return {
      status: "ok",
      diagnostics: (await diagnosticsResponse.json()) as DatasetDiagnostics,
      sources: (await sourcesResponse.json()) as DatasetSource[],
    };
  } catch (error) {
    return {
      status: "unavailable",
      diagnostics: null,
      sources: [],
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getClassificationOverview(): Promise<ClassificationOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/intelligence/evaluation`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        evaluation: null,
        detail: `Classification endpoint returned ${response.status}`,
      };
    }

    return {
      status: "ok",
      evaluation: (await response.json()) as ClassificationEvaluation,
    };
  } catch (error) {
    return {
      status: "unavailable",
      evaluation: null,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getRetrievalOverview(): Promise<RetrievalOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/retrieval/evaluation`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        evaluation: null,
        detail: `Retrieval endpoint returned ${response.status}`,
      };
    }

    return {
      status: "ok",
      evaluation: (await response.json()) as RetrievalEvaluation,
    };
  } catch (error) {
    return {
      status: "unavailable",
      evaluation: null,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getAIOverview(): Promise<AIOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/ai/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        statusReport: null,
        detail: `AI status endpoint returned ${response.status}`,
      };
    }

    return {
      status: "ok",
      statusReport: (await response.json()) as AIProviderStatus,
    };
  } catch (error) {
    return {
      status: "unavailable",
      statusReport: null,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getDraftOverview(): Promise<DraftOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/drafts/evaluation`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        evaluation: null,
        detail: `Draft endpoint returned ${response.status}`,
      };
    }

    return {
      status: "ok",
      evaluation: (await response.json()) as DraftEvaluation,
    };
  } catch (error) {
    return {
      status: "unavailable",
      evaluation: null,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getWorkflowOverview(): Promise<WorkflowOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/workflow/overview`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        statusReport: null,
        detail: `Workflow endpoint returned ${response.status}`,
      };
    }

    return {
      status: "ok",
      statusReport: (await response.json()) as WorkflowStatusReport,
    };
  } catch (error) {
    return {
      status: "unavailable",
      statusReport: null,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getInsightsOverview(): Promise<InsightsOverview> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const [themeResponse, briefResponse] = await Promise.all([
      fetch(`${baseUrl}/api/themes/radar`, { cache: "no-store" }),
      fetch(`${baseUrl}/api/marketing-briefs/current`, { cache: "no-store" }),
    ]);

    if (!themeResponse.ok || !briefResponse.ok) {
      return {
        status: "unavailable",
        themeRadar: null,
        marketingBrief: null,
        detail: "Insights endpoints are unavailable.",
      };
    }

    const brief = (await briefResponse.json()) as MarketingBriefResponse;
    return {
      status: "ok",
      themeRadar: (await themeResponse.json()) as ThemeRadarResponse,
      marketingBrief: brief.data,
    };
  } catch (error) {
    return {
      status: "unavailable",
      themeRadar: null,
      marketingBrief: null,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
