"use client";

import { useState } from "react";

import { getConfiguredApiBaseUrl } from "@/lib/api";
import type {
  MarketingBrief,
  MarketingBriefResponse,
  ThemeRadarItem,
  ThemeRadarResponse,
} from "@/lib/api";

type InsightsClientProps = {
  initialThemeRadar: ThemeRadarResponse | null;
  initialMarketingBrief: MarketingBrief | null;
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

export function InsightsClient({
  initialThemeRadar,
  initialMarketingBrief,
}: InsightsClientProps) {
  const [themeRadar, setThemeRadar] = useState(initialThemeRadar);
  const [marketingBrief, setMarketingBrief] = useState(initialMarketingBrief);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateBrief() {
    setLoading(true);
    setStatusMessage("");
    try {
      const [themes, brief] = await Promise.all([
        fetchJson<ThemeRadarResponse>("/api/themes/radar"),
        fetchJson<MarketingBriefResponse>("/api/marketing-briefs/generate", {
          method: "POST",
          body: JSON.stringify({ period_label: "Demo Month" }),
        }),
      ]);
      setThemeRadar(themes);
      setMarketingBrief(brief.data);
      setStatusMessage(`Marketing brief generated from ${brief.data.source_ticket_count} tickets.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Insight generation failed.");
    } finally {
      setLoading(false);
    }
  }

  const topThemes = themeRadar?.data.slice(0, 6) ?? [];
  const sourceTicketCount = themeRadar?.meta.clustered_ticket_count ?? 0;
  const themeCount = themeRadar?.meta.theme_count ?? 0;
  const productGapCount =
    themeRadar?.data.filter((theme) => theme.product_page_gap).length ?? 0;
  const risingCount =
    themeRadar?.data.filter((theme) => theme.trend_direction === "rising").length ?? 0;

  return (
    <section className="insights-console" data-testid="phase10-insights">
      <div className="console-header">
        <div>
          <p className="eyebrow">Phase 10 Theme Radar</p>
          <h3>Marketing Intelligence</h3>
        </div>
        <button
          className="primary-action"
          disabled={loading}
          onClick={generateBrief}
          type="button"
        >
          {loading ? "Generating" : "Generate Brief"}
        </button>
      </div>

      <div className="workbench-stat-grid">
        <div>
          <strong>{sourceTicketCount}</strong>
          <span>Clustered tickets</span>
        </div>
        <div>
          <strong>{themeCount}</strong>
          <span>Themes</span>
        </div>
        <div>
          <strong>{productGapCount}</strong>
          <span>Product gaps</span>
        </div>
        <div>
          <strong>{risingCount}</strong>
          <span>Rising signals</span>
        </div>
      </div>

      {statusMessage ? (
        <div className="status-strip" role="status">
          {statusMessage}
        </div>
      ) : null}

      <div className="theme-grid">
        {topThemes.map((theme) => (
          <ThemeCard key={theme.theme_name} theme={theme} />
        ))}
      </div>

      {marketingBrief ? (
        <div className="brief-layout">
          <section className="brief-panel">
            <div className="mini-heading">
              <p className="eyebrow">Monthly Brief</p>
              <strong>{marketingBrief.period_label}</strong>
            </div>
            <pre className="brief-markdown">{marketingBrief.markdown}</pre>
          </section>

          <section className="opportunity-list">
            <div className="mini-heading">
              <p className="eyebrow">Opportunities</p>
              <strong>{marketingBrief.opportunities.length}</strong>
            </div>
            {marketingBrief.opportunities.slice(0, 5).map((opportunity) => (
              <article className="opportunity-card" key={opportunity.theme_name}>
                <div className="review-heading">
                  <h4>{opportunity.theme_name}</h4>
                  {opportunity.product_page_update_needed ? (
                    <span className="status-pill">Page update</span>
                  ) : null}
                </div>
                <p>{opportunity.insight}</p>
                <p>{opportunity.campaign_angle}</p>
                <div className="chip-row">
                  {opportunity.persona_focus.map((persona) => (
                    <span key={persona}>{persona}</span>
                  ))}
                </div>
                <small>Evidence: {opportunity.evidence_ticket_ids.join(", ")}</small>
              </article>
            ))}
          </section>
        </div>
      ) : (
        <p className="dataset-unavailable">Marketing brief is unavailable.</p>
      )}
    </section>
  );
}

function ThemeCard({ theme }: { theme: ThemeRadarItem }) {
  return (
    <article className="theme-card">
      <div className="review-heading">
        <div>
          <p className="eyebrow">{theme.trend_direction}</p>
          <h4>{theme.theme_name}</h4>
        </div>
        <span className="count-pill">{theme.frequency}</span>
      </div>
      <div className="chip-row">
        {theme.product_page_gap ? <span>Product page gap</span> : null}
        {theme.marketing_signal ? <span>Marketing signal</span> : null}
        {theme.gap_count ? <span>{theme.gap_count} KB gap</span> : null}
      </div>
      <p>{theme.recommended_kb_action}</p>
      <p>{theme.recommended_marketing_action}</p>
      <small>Evidence: {theme.representative_ticket_ids.slice(0, 3).join(", ")}</small>
    </article>
  );
}
