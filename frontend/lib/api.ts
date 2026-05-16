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
