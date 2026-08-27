import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/sesira/empty-state";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge, type StatusTone } from "@/components/sesira/status-badge";
import type { AutomationCard } from "@/lib/automations/contracts";
import { AUTOMATION_LEVEL_LABELS } from "@/lib/automations/view-model";

const HEALTH_TONES: Record<AutomationCard["health"]["tone"], StatusTone> = {
  emerald: "emerald",
  amber: "amber",
  cyan: "cyan",
  slate: "neutral",
};

export function AutomationsScreen({ cards }: { cards: AutomationCard[] }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Automatisations"
        title="Un niveau de confiance clair pour chaque action."
        description="Sesira commence par observer. Votre équipe garde la main sur tout ce qui demande du jugement, une décision commerciale ou une action sensible."
      />

      <section className="mt-8  border border-[var(--blue)] bg-[var(--blue-soft)] p-5 md:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--blue)]" />
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
              <p className="text-xs font-semibold tracking-[0.18em] text-[var(--blue)]">ACTIVÉES</p>
              <h2 id="enabled-automations-title" className="mt-2 text-xl font-semibold">
                Vos automatisations
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {cards.length} module{cards.length > 1 ? "s" : ""} visible{cards.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="mt-5 grid gap-px border border-[var(--line)] bg-[var(--line)]">
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
    <section className="mt-8 border border-[var(--ink)] bg-[var(--ink)] p-5 text-white md:p-6" aria-labelledby="trust-title">
      <p className="sesira-eyebrow !text-[var(--blue-light)]">CONFIANCE PROGRESSIVE</p>
      <h2 id="trust-title" className="mt-2 text-lg font-semibold">Du constat à l’action contrôlée</h2>
      <ol className="mt-5 grid gap-px bg-white/15 md:grid-cols-2 xl:grid-cols-4">
        {levels.map(([title, description], index) => (
          <li key={title} className={`bg-[var(--ink)] p-4 ${index === 0 ? "text-white" : "text-white/55"}`}>
            <p className="text-xs font-semibold text-[var(--blue-light)]">0{index + 1}</p>
            <p className={`mt-2 text-sm ${index === 0 ? "font-semibold" : "font-medium"}`}>{title}</p>
            <p className="mt-3 text-xs leading-5">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AutomationCardView({ card }: { card: AutomationCard }) {
  const noRecordedResult = card.level === "OBSERVATION" || !card.activityAvailable;

  return (
    <article className="grid bg-[var(--surface)] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="p-5 md:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <StatusBadge tone="neutral">Activée</StatusBadge>
            <StatusBadge tone="blue">{AUTOMATION_LEVEL_LABELS[card.level]}</StatusBadge>
            <StatusBadge tone={HEALTH_TONES[card.health.tone]}>{card.health.label}</StatusBadge>
          </div>
        </div>

        {card.level === "SHADOW" ? (
          <div className="mt-5 border-l-2 border-[var(--blue)] bg-[var(--blue-soft)] p-4">
            <p className="text-xs font-semibold tracking-wide text-[var(--blue)]">OBSERVATION EN CONDITIONS RÉELLES</p>
            <p className="mt-2 font-medium">Sesira aurait effectué cette action.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">Action préparée uniquement. Aucun envoi n’a eu lieu.</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-px border border-[var(--line-soft)] bg-[var(--line-soft)] sm:grid-cols-3">
          <StatusFact icon={CheckCircle2} label="Dernière réussite" value={!card.activityAvailable ? "Information indisponible" : noRecordedResult ? "—" : card.lastSuccess ?? "—"} tone="text-[var(--blue)]" />
          <StatusFact icon={AlertTriangle} label="Dernier problème" value={!card.activityAvailable ? "Information indisponible" : noRecordedResult ? "—" : card.lastProblem ?? "—"} tone="text-[var(--sand-text)]" />
          <div className="bg-[var(--surface)] p-4">
            <p className="sesira-eyebrow">Activité 30 jours</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">{noRecordedResult ? "—" : card.recentActivity.length}</p>
          </div>
        </div>

        {!card.activityAvailable ? (
          <p className="mt-4 border-l-2 border-[var(--sand-line)] bg-[var(--sand)] p-3 text-xs text-[var(--sand-text)]">Activité temporairement indisponible.</p>
        ) : !card.recentActivity.length ? (
          <p className="mt-4 text-xs text-[var(--ink-mute)]">Aucune activité réelle enregistrée.</p>
        ) : null}

        {card.activityAvailable && card.recentActivity.length ? (
          <section className="mt-5" aria-label={`Activité récente — ${card.title}`}>
            <p className="sesira-eyebrow">Activité récente</p>
            <ul className="mt-2 divide-y divide-[var(--line-soft)] border-y border-[var(--line-soft)]">
              {card.recentActivity.map((activity) => (
                <li key={activity.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <p>{activity.label}</p>
                  </div>
                  <p className="text-xs text-[var(--ink-mute)]">{activity.date}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="border-t border-[var(--line-soft)] bg-[var(--paper)] p-5 md:p-6 xl:border-l xl:border-t-0">
        <p className="sesira-eyebrow">CE QUE SESIRA PEUT FAIRE</p>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{card.allowedAction}</p>
        <div className="mt-6 border-t border-[var(--line-strong)] pt-5">
          <p className="sesira-eyebrow text-[var(--ink)]">TOUJOURS DÉCIDÉ PAR VOUS</p>
          <p className="mt-3 text-sm font-medium leading-6 text-[var(--ink)]">{card.humanJudgment}</p>
        </div>
      </aside>
    </article>
  );
}

function StatusFact({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${tone}`} />
        <p className="text-xs text-[var(--muted)]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
