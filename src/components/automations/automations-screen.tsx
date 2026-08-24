import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/sesira/empty-state";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge, type StatusTone } from "@/components/sesira/status-badge";
import type { AutomationCard, AutomationModuleKey } from "@/lib/automations/contracts";
import { AUTOMATION_LEVEL_LABELS } from "@/lib/automations/view-model";

const MODULE_ICONS: Record<AutomationModuleKey, LucideIcon> = {
  QUOTE_FOLLOW_UP: RefreshCw,
  REQUEST_INTAKE: FileText,
  EMAIL_TRIAGE: Mail,
  REPORT_CREATION: BarChart3,
  INVOICE_FOLLOW_UP: ReceiptText,
};

const HEALTH_TONES: Record<AutomationCard["health"]["tone"], StatusTone> = {
  emerald: "emerald",
  amber: "amber",
  cyan: "cyan",
  slate: "neutral",
};

const ACTIVITY_DOTS: Record<AutomationCard["recentActivity"][number]["tone"], string> = {
  emerald: "bg-emerald-300",
  amber: "bg-amber-300",
  cyan: "bg-cyan-300",
  slate: "bg-slate-400",
};

export function AutomationsScreen({ cards }: { cards: AutomationCard[] }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Automatisations"
        title="Un niveau de confiance clair pour chaque processus."
        description="Sesira commence par observer. Votre équipe garde la main sur tout ce qui demande du jugement, une décision commerciale ou une action sensible."
      />

      <section className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-cyan-300" />
          <div>
            <h2 className="font-medium">Aucune action ne peut être lancée depuis cet écran.</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Les cartes décrivent les autorisations configurées et montrent uniquement une activité
              réellement enregistrée. Elles ne prouvent pas qu’une action externe a été exécutée.
            </p>
          </div>
        </div>
      </section>

      <TrustLevels />

      {cards.length ? (
        <section className="mt-10" aria-labelledby="enabled-automations-title">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-violet-300">ACTIVÉES</p>
              <h2 id="enabled-automations-title" className="mt-2 text-xl font-semibold">
                Vos automatisations
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {cards.length} module{cards.length > 1 ? "s" : ""} visible{cards.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {cards.map((card) => <AutomationCardView key={card.id} card={card} />)}
          </div>
        </section>
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={Bot}
            title="Aucune automatisation activée."
            description="Seuls les modules activés pour votre entreprise apparaissent ici. Aucun processus n’est exécuté depuis cette page."
          />
        </div>
      )}
    </div>
  );
}

function TrustLevels() {
  const levels = [
    ["Observation", "Sesira observe les informations disponibles."],
    ["Observation en conditions réelles", "Sesira prépare ce qu’elle aurait fait, sans agir."],
    ["Validation par votre équipe", "Votre équipe valide avant toute action autorisée."],
    ["Automatique", "Seules les actions standard explicitement autorisées peuvent avancer."],
  ] as const;

  return (
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6" aria-labelledby="trust-title">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)]">CONFIANCE PROGRESSIVE</p>
      <h2 id="trust-title" className="mt-2 text-lg font-semibold">Du constat à l’action contrôlée</h2>
      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {levels.map(([title, description], index) => (
          <li key={title} className="rounded-xl bg-[var(--panel-soft)] p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-violet-400/15 text-xs font-semibold text-violet-200">
                {index + 1}
              </span>
              <p className="text-sm font-medium">{title}</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AutomationCardView({ card }: { card: AutomationCard }) {
  const Icon = MODULE_ICONS[card.key];

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
          </div>
        </div>
        <StatusBadge tone={HEALTH_TONES[card.health.tone]}>{card.health.label}</StatusBadge>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <StatusBadge tone="emerald">Activée</StatusBadge>
        <StatusBadge tone="violet">{AUTOMATION_LEVEL_LABELS[card.level]}</StatusBadge>
      </div>

      {card.level === "SHADOW" ? (
        <div className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/5 p-4">
          <div className="flex items-center gap-2 text-violet-200">
            <Sparkles className="size-4" />
            <p className="text-xs font-semibold tracking-wide">APERÇU SHADOW</p>
          </div>
          <p className="mt-2 font-medium">Sesira aurait effectué cette action.</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Cette phrase explique le mode. Elle ne représente pas un run réel et aucun envoi n’est effectué.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl bg-[var(--panel-soft)] p-4" aria-label={`Activité récente — ${card.title}`}>
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-cyan-300" />
            <h4 className="text-sm font-medium">Activité récente</h4>
          </div>
          {!card.activityAvailable ? (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Activité temporairement indisponible.</p>
          ) : card.recentActivity.length ? (
            <ul className="mt-4 space-y-3">
              {card.recentActivity.map((activity) => (
                <li key={activity.id} className="flex items-start gap-3 text-sm">
                  <span className={`mt-2 size-1.5 shrink-0 rounded-full ${ACTIVITY_DOTS[activity.tone]}`} />
                  <div>
                    <p>{activity.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{activity.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Aucune activité réelle enregistrée.</p>
          )}
        </section>

        <section className="grid gap-3" aria-label={`État récent — ${card.title}`}>
          <StatusFact
            icon={CheckCircle2}
            label="Dernier succès"
            value={
              card.activityAvailable
                ? card.lastSuccess ?? "Aucun succès enregistré"
                : "Information indisponible"
            }
            tone="text-emerald-300"
          />
          <StatusFact
            icon={AlertTriangle}
            label="Dernier problème"
            value={
              card.activityAvailable
                ? card.lastProblem ?? "Aucun problème enregistré"
                : "Information indisponible"
            }
            tone="text-amber-300"
          />
        </section>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4">
          <div className="flex items-center gap-2 text-cyan-200">
            <Bot className="size-4" />
            <h4 className="text-sm font-medium">Ce que Sesira peut faire</h4>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.allowedAction}</p>
        </div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
          <div className="flex items-center gap-2 text-amber-200">
            <UserRoundCheck className="size-4" />
            <h4 className="text-sm font-medium">Toujours à votre équipe</h4>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.humanJudgment}</p>
        </div>
      </div>
    </article>
  );
}

function StatusFact({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-[var(--panel-soft)] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${tone}`} />
        <p className="text-xs text-[var(--muted)]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
