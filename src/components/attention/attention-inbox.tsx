import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { AttentionItemActions } from "@/components/attention/attention-item-actions";
import { EmptyState } from "@/components/sesira/empty-state";
import { MetricCard } from "@/components/sesira/metric-card";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge, type StatusTone } from "@/components/sesira/status-badge";
import {
  attentionCategoryLabel,
  attentionPriorityLabels,
  attentionStatusLabels,
  formatAttentionDate,
  formatAttentionDateTime,
  isAttentionOverdue,
} from "@/lib/attention/format";
import type { AttentionInboxItem } from "@/lib/attention/view-model";
import type { AttentionPriority, AttentionStatus } from "@/lib/attention/schema";

type AttentionView = "open" | "resolved";

export function AttentionInbox({
  items,
  view,
  stats,
}: {
  items: AttentionInboxItem[];
  view: AttentionView;
  stats: { open: number; urgent: number; due: number; resolved: number };
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Décisions humaines"
        title="À traiter"
        description="Voyez ce qui s’est passé, pourquoi votre attention est nécessaire et quelle décision prendre."
        actions={
          <div className="inline-flex  border border-[var(--border)] bg-[var(--panel)] p-1">
            <ViewLink href="/app/attention" active={view === "open"} count={stats.open}>
              Ouverts
            </ViewLink>
            <ViewLink href="/app/attention?view=resolved" active={view === "resolved"} count={stats.resolved}>
              Terminés
            </ViewLink>
          </div>
        }
      />

      <section className="sesira-metric-grid mt-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Inbox} label="À traiter" value={stats.open} tone="blue" />
        <MetricCard icon={CircleAlert} label="Urgents" value={stats.urgent} tone="rose" />
        <MetricCard icon={CalendarClock} label="Échus" value={stats.due} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Terminés" value={stats.resolved} tone="emerald" />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{view === "open" ? "Décisions en attente" : "Décisions terminées"}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {view === "open"
                ? "Les urgences et les échéances proches apparaissent en premier."
                : "Les éléments résolus ou ignorés restent consultables ici."}
            </p>
          </div>
        </div>

        {items.length ? (
          <div className="grid gap-px border border-[var(--line)] bg-[var(--line)]">
            {items.map((item) => <AttentionCard key={item.id} item={item} open={view === "open"} />)}
          </div>
        ) : (
          <AttentionEmptyState view={view} />
        )}
      </section>
    </div>
  );
}

function AttentionCard({ item, open }: { item: AttentionInboxItem; open: boolean }) {
  const overdue = isAttentionOverdue(item.due_at, item.status);

  return (
    <article
      id={`attention-${item.id}`}
      className="scroll-mt-6 overflow-hidden bg-[var(--surface)] transition target:outline target:outline-2 target:outline-[var(--blue)]"
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <StatusBadge tone="neutral">{attentionCategoryLabel(item.category)}</StatusBadge>
            <AttentionStatusBadge status={item.status} />
          </div>

          <h3 className="mt-5 font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-[var(--ink)]">Décision à prendre</h3>

          <div className="mt-5 grid gap-4">
            <DecisionBlock eyebrow="Ce qui s’est passé." text={item.title} />
            <DecisionBlock eyebrow="Pourquoi Sesira vous le montre." text={item.explanation} />
            <DecisionBlock eyebrow="Ce que vous pouvez faire." text={item.suggested_action ?? "Consultez l’élément lié, puis choisissez l’issue."} />
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-3.5" />
              Signalé le {formatAttentionDateTime(item.created_at)}
            </span>
            {item.due_at ? (
              <span className={`inline-flex items-center gap-2 ${overdue ? "font-medium text-[var(--danger)]" : ""}`}>
                <CalendarClock className="size-3.5" />
                {overdue ? "Échu" : "À décider"} le {formatAttentionDate(item.due_at)}
              </span>
            ) : null}
            {item.assigneeName ? (
              <span className="inline-flex items-center gap-2">
                <UserRound className="size-3.5" />
                {item.assigneeName}
              </span>
            ) : null}
            {!open && item.resolved_at ? (
              <span>Terminé le {formatAttentionDateTime(item.resolved_at)}</span>
            ) : null}
          </div>
        </div>

        <aside className="flex flex-col justify-between border-t border-[var(--line-soft)] bg-[var(--surface)] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--ink-mute)]">Élément concerné</p>
            {item.entity ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-[var(--blue)]">{entityTypeLabel(item.entity.type)}</p>
                {item.entity.amount ? (
                  <p className="mt-2 whitespace-nowrap [overflow-wrap:anywhere] font-[family-name:var(--font-display)] text-[1.375rem] font-semibold tracking-[-0.03em] tabular-nums text-[var(--ink)]">{item.entity.amount}</p>
                ) : (
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{item.entity.label}</p>
                )}
                {item.entity.amount ? <p className="mt-2 text-sm text-[var(--ink)]">{item.entity.label}</p> : null}
                {item.entity.detail ? <p className="mt-1 text-sm text-[var(--muted)]">{item.entity.detail}</p> : null}
                <Link
                  href={item.entity.href}
                  className="mt-5 inline-flex min-h-11 items-center gap-2  border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--blue)] hover:opacity-90"
                >
                  Voir {entityTypeArticle(item.entity.type)}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                Aucun client, demande ou devis n’est relié à cet élément.
              </p>
            )}
          </div>

          {open ? (
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <AttentionItemActions attentionId={item.id} />
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function DecisionBlock({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <div>
      <p className="text-sm leading-6 text-[var(--ink)]"><strong className="font-semibold">{eyebrow}</strong> {text}</p>
    </div>
  );
}

function AttentionEmptyState({ view }: { view: AttentionView }) {
  return (
    <EmptyState
      icon={CheckCircle2}
      tone="emerald"
      title={view === "open" ? "Rien ne demande votre décision." : "Aucune décision terminée pour le moment."}
      description={
        view === "open"
          ? "Les situations qui nécessitent votre jugement apparaîtront ici avec leur contexte."
          : "Les éléments résolus et ignorés apparaîtront ici."
      }
    />
  );
}

function ViewLink({ href, active, count, children }: { href: string; active: boolean; count: number; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center gap-2  px-3 py-2 text-sm transition ${
        active ? "bg-[var(--blue-soft)] font-medium text-[var(--blue)]" : "text-[var(--muted)] hover:text-[var(--blue)]"
      }`}
    >
      {children}
      <span className=" bg-white/5 px-2 py-0.5 text-xs">{count}</span>
    </Link>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const tones: Record<string, StatusTone> = {
    URGENT: "rose",
    HIGH: "amber",
    NORMAL: "cyan",
    LOW: "neutral",
  };
  const label = priority in attentionPriorityLabels
    ? attentionPriorityLabels[priority as AttentionPriority]
    : "À vérifier";

  return (
    <StatusBadge tone={tones[priority] ?? "cyan"} emphasis="strong">
      Priorité {label.toLowerCase()}
    </StatusBadge>
  );
}

function AttentionStatusBadge({ status }: { status: string }) {
  const label = status in attentionStatusLabels
    ? attentionStatusLabels[status as AttentionStatus]
    : "Terminé";

  const tones: Record<string, StatusTone> = {
    OPEN: "violet",
    IN_PROGRESS: "cyan",
    RESOLVED: "emerald",
    DISMISSED: "neutral",
  };

  return <StatusBadge tone={tones[status] ?? "emerald"}>{label}</StatusBadge>;
}

function entityTypeLabel(type: "customer" | "request" | "quote"): string {
  return { customer: "Client", request: "Demande", quote: "Devis" }[type];
}

function entityTypeArticle(type: "customer" | "request" | "quote"): string {
  return { customer: "le client", request: "la demande", quote: "le devis" }[type];
}
