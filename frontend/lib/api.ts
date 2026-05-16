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
