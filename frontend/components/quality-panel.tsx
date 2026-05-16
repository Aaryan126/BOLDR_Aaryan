import type { QualityScorecard } from "@/lib/api";

type QualityPanelProps = {
  scorecard: QualityScorecard | null;
};

function formatMetricValue(value: number, unit: "ratio" | "count" | "boolean") {
  if (unit === "ratio") {
    return `${Math.round(value * 100)}%`;
  }
  if (unit === "boolean") {
    return value === 1 ? "Pass" : "Fail";
  }
  return String(value);
}

export function QualityPanel({ scorecard }: QualityPanelProps) {
  if (!scorecard) {
    return (
      <section className="quality-console" data-testid="phase11-quality">
        <p className="dataset-unavailable">Quality scorecard is unavailable.</p>
      </section>
    );
  }

  const passCount = scorecard.metrics.filter((metric) => metric.status === "pass").length;
  const documentedCount = scorecard.metrics.filter(
    (metric) => metric.status === "documented_exception",
  ).length;
  const goldenPassCount = scorecard.golden_fixtures.filter((fixture) => fixture.passed).length;

  return (
    <section className="quality-console" data-testid="phase11-quality">
      <div className="console-header">
        <div>
          <p className="eyebrow">Phase 11 Quality</p>
          <h3>Evaluation Scorecard</h3>
        </div>
        <span className={`status-pill status-${scorecard.overall_status}`}>
          {scorecard.overall_status.replaceAll("_", " ")}
        </span>
      </div>

      <p className="quality-summary">{scorecard.summary}</p>

      <div className="workbench-stat-grid">
        <div>
          <strong>{scorecard.total_ticket_count}</strong>
          <span>Tickets evaluated</span>
        </div>
        <div>
          <strong>{passCount}</strong>
          <span>Passing metrics</span>
        </div>
        <div>
          <strong>{documentedCount}</strong>
          <span>Documented notes</span>
        </div>
        <div>
          <strong>{goldenPassCount}</strong>
          <span>Golden fixtures</span>
        </div>
      </div>

      <div className="quality-grid">
        {scorecard.metrics.map((metric) => (
          <article className="quality-card" key={metric.metric_id}>
            <div className="review-heading">
              <h4>{metric.label}</h4>
              <span className={`status-pill status-${metric.status}`}>
                {metric.status.replaceAll("_", " ")}
              </span>
            </div>
            <strong>{formatMetricValue(metric.value, metric.unit)}</strong>
            <p>Target: {formatMetricValue(metric.target, metric.unit)}</p>
            <p>{metric.detail}</p>
            {metric.denominator ? (
              <small>
                {metric.numerator} / {metric.denominator}
              </small>
            ) : null}
          </article>
        ))}
      </div>

      <div className="quality-detail-layout">
        <section className="fixture-panel">
          <div className="mini-heading">
            <p className="eyebrow">Golden Fixtures</p>
            <strong>
              {goldenPassCount}/{scorecard.golden_fixtures.length}
            </strong>
          </div>
          <div className="fixture-list">
            {scorecard.golden_fixtures.map((fixture) => (
              <article className="fixture-row" key={fixture.fixture_id}>
                <div>
                  <strong>{fixture.ticket_id}</strong>
                  <span>{fixture.scenario}</span>
                </div>
                <em>{fixture.passed ? "Pass" : "Fail"}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="fixture-panel">
          <div className="mini-heading">
            <p className="eyebrow">Issues To Inspect</p>
            <strong>{scorecard.issues.length}</strong>
          </div>
          {scorecard.issues.map((issue) => (
            <article className="issue-card" key={issue.issue_id}>
              <div className="review-heading">
                <h4>{issue.area}</h4>
                <span className="status-pill">{issue.severity}</span>
              </div>
              <p>{issue.summary}</p>
              <p>{issue.recommended_action}</p>
              <small>{issue.ticket_ids.join(", ")}</small>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
