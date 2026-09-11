import type { ReactNode } from "react";
import { Inbox, Sparkles } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <section className="empty-state">
      <div className="empty-orbit" aria-hidden="true"><Inbox size={21} strokeWidth={1.8} /></div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </section>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warning" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function MetricCard({ label, value = "—", note }: { label: string; value?: string; note?: string }) {
  return (
    <article className="metric-card">
      <span className="metric-card-label"><Sparkles size={13} aria-hidden="true" />{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}
