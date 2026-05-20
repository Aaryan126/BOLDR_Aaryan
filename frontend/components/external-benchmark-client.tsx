"use client";

import { useState } from "react";

import { getConfiguredApiBaseUrl } from "@/lib/api";
import type {
  ExternalBenchmark,
  ExternalBenchmarkResponse,
  ExternalSource,
  ExternalSourceListResponse,
} from "@/lib/api";

type ExternalBenchmarkClientProps = {
  initialSources: ExternalSource[];
  initialBenchmarks: ExternalBenchmark[];
};

const apiBaseUrl = getConfiguredApiBaseUrl();

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("Backend API URL is not configured.");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function ExternalBenchmarkClient({
  initialSources,
  initialBenchmarks,
}: ExternalBenchmarkClientProps) {
  const [sources, setSources] = useState(initialSources);
  const [benchmarks, setBenchmarks] = useState(initialBenchmarks);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateBenchmarks() {
    setLoading(true);
    setStatusMessage("");
    try {
      const [sourcesBody, benchmarksBody] = await Promise.all([
        fetchJson<ExternalSourceListResponse>("/api/external/sources"),
        fetchJson<ExternalBenchmarkResponse>("/api/external/benchmarks/generate", {
          method: "POST",
        }),
      ]);
      setSources(sourcesBody.data);
      setBenchmarks(benchmarksBody.data);
      setStatusMessage(`Benchmarked ${benchmarksBody.data.length} themes against ${sourcesBody.data.length} source groups.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Benchmark generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const sourceTypes = new Set(sources.map((source) => source.source_type));
  const marketWideCount = benchmarks.filter((benchmark) =>
    benchmark.classification.includes("market_wide"),
  ).length;
  const sourceUrlCount = benchmarks.reduce(
    (total, benchmark) => total + benchmark.source_urls.length,
    0,
  );
  const strongSignalCount = benchmarks.filter(
    (benchmark) => benchmark.signal_strength === "strong",
  ).length;

  return (
    <section className="external-console" data-testid="phase12-external">
      <div className="console-header">
        <div>
          <p className="eyebrow">Phase 12 Bonus</p>
          <h3>External Sentiment Benchmarking</h3>
        </div>
        <button
          className="primary-action"
          disabled={loading}
          onClick={generateBenchmarks}
          type="button"
        >
          {loading ? "Benchmarking" : "Generate Benchmarks"}
        </button>
      </div>

      <div className="workbench-stat-grid">
        <div>
          <strong>{benchmarks.length}</strong>
          <span>Benchmarked themes</span>
        </div>
        <div>
          <strong>{sources.length}</strong>
          <span>Source groups</span>
        </div>
        <div>
          <strong>{sourceTypes.size}</strong>
          <span>Source types</span>
        </div>
        <div>
          <strong>{marketWideCount}</strong>
          <span>Market-wide signals</span>
        </div>
        <div>
          <strong>{sourceUrlCount}</strong>
          <span>Source URLs</span>
        </div>
        <div>
          <strong>{strongSignalCount}</strong>
          <span>Strong signals</span>
        </div>
      </div>

      {statusMessage ? (
        <div className="status-strip" role="status">
          {statusMessage}
        </div>
      ) : null}

      <div className="external-layout">
        <section className="benchmark-list">
          {benchmarks.map((benchmark) => {
            const externalSourceCount =
              benchmark.external_source_count ?? benchmark.external_sources.length;
            const signalStrength = benchmark.signal_strength ?? "directional";
            const rationale =
              benchmark.benchmark_rationale ??
              "Internal support themes are being compared against curated external market signals.";
            const validationSteps = benchmark.validation_steps ?? [];
            return (
              <article className="benchmark-card" key={benchmark.theme_key}>
                <div className="review-heading">
                  <div>
                    <p className="eyebrow">{benchmark.external_sentiment}</p>
                    <h4>{benchmark.theme}</h4>
                  </div>
                  <span className="count-pill">{Math.round(benchmark.confidence * 100)}%</span>
                </div>
                <div className="chip-row">
                  <span>{benchmark.internal_ticket_count} internal tickets</span>
                  <span>{benchmark.external_mention_count} external mentions</span>
                  <span>{externalSourceCount} source groups</span>
                  <span>{signalStrength} signal</span>
                  <span>{benchmark.classification.replaceAll("_", " ")}</span>
                </div>
                <p>{rationale}</p>
                <p>{benchmark.recommended_action}</p>
                <small>Internal evidence: {benchmark.internal_ticket_ids.slice(0, 5).join(", ")}</small>
                {validationSteps.length > 0 ? (
                  <div className="benchmark-validation-list">
                    {validationSteps.map((step) => (
                      <span key={step}>{step}</span>
                    ))}
                  </div>
                ) : null}
                <div className="source-link-list">
                  {benchmark.source_urls.map((url) => (
                    <a href={url} key={url} rel="noreferrer" target="_blank">
                      {url.replace("https://", "")}
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="source-registry">
          <div className="mini-heading">
            <p className="eyebrow">Source Registry</p>
            <strong>{sources.length}</strong>
          </div>
          {sources.map((source) => (
            <article className="source-card" key={source.source_id}>
              <div className="review-heading">
                <h4>{source.name}</h4>
                <span className="status-pill">{source.source_type.replaceAll("_", " ")}</span>
              </div>
              <p>{source.rationale}</p>
              <p>{source.limitations}</p>
              <div className="chip-row">
                {source.buyer_signals.slice(0, 3).map((signal) => (
                  <span key={signal}>{signal}</span>
                ))}
              </div>
              <a href={source.url} rel="noreferrer" target="_blank">
                {source.url.replace("https://", "")}
              </a>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
