import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  Lightbulb,
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
          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1">
            <ViewLink href="/app/attention" active={view === "open"} count={stats.open}>
              Ouverts
            </ViewLink>
            <ViewLink href="/app/attention?view=resolved" active={view === "resolved"} count={stats.resolved}>
              Terminés
            </ViewLink>
          </div>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Inbox} label="À traiter" value={stats.open} tone="violet" />
        <MetricCard icon={CircleAlert} label="Urgents" value={stats.urgent} tone="rose" />
        <MetricCard icon={CalendarClock} label="Échus" value={stats.due} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Terminés" value={stats.resolved} tone="emerald" />
      </section>

      <section className="mt-6">
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
          <div className="grid gap-4">
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
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] transition target:border-violet-400/50 target:ring-2 target:ring-violet-400/20"
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} />
            <StatusBadge tone="neutral">{attentionCategoryLabel(item.category)}</StatusBadge>
            <AttentionStatusBadge status={item.status} />
          </div>

          <h3 className="mt-5 text-xl font-semibold leading-snug text-white">{item.title}</h3>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <DecisionBlock
              eyebrow="Pourquoi Sesira vous le montre"
              text={item.explanation}
              icon={AlertTriangle}
              tone="amber"
            />
            <DecisionBlock
              eyebrow="Prochaine décision"
              text={item.suggested_action ?? "Consultez l’élément lié, puis choisissez l’issue."}
              icon={Lightbulb}
              tone="violet"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-3.5" />
              Signalé le {formatAttentionDateTime(item.created_at)}
            </span>
            {item.due_at ? (
              <span className={`inline-flex items-center gap-2 ${overdue ? "font-medium text-rose-300" : ""}`}>
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

        <aside className="flex flex-col justify-between border-t border-[var(--border)] bg-[var(--background)]/70 p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Élément concerné</p>
            {item.entity ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-violet-300">{entityTypeLabel(item.entity.type)}</p>
                {item.entity.amount ? (
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{item.entity.amount}</p>
                ) : (
                  <p className="mt-2 text-lg font-semibold text-white">{item.entity.label}</p>
                )}
                {item.entity.amount ? <p className="mt-2 text-sm text-slate-200">{item.entity.label}</p> : null}
                {item.entity.detail ? <p className="mt-1 text-sm text-[var(--muted)]">{item.entity.detail}</p> : null}
                <Link
                  href={item.entity.href}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-white transition hover:border-violet-400/50 hover:bg-violet-400/10"
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

function DecisionBlock({
  eyebrow,
  text,
  icon: Icon,
  tone,
}: {
  eyebrow: string;
  text: string;
  icon: typeof AlertTriangle;
  tone: "amber" | "violet";
}) {
  const tones = {
    amber: "bg-amber-400/10 text-amber-200",
    violet: "bg-violet-400/10 text-violet-200",
  };

  return (
    <div className="flex gap-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
      </div>
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
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-violet-400/15 font-medium text-violet-100" : "text-[var(--muted)] hover:text-white"
      }`}
    >
      {children}
      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs">{count}</span>
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
