import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {subtitle ? <p className="ui-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="ui-page-header-action">{action}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-section-card">
      <div className="ui-section-head">
        <h4>{title}</h4>
        {badge ? <span className="count-pill">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="ui-metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return <span className={`status-pill tone-${tone}`}>{label}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-panel">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
