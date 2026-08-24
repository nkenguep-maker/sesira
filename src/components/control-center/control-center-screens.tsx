import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  CircleDollarSign,
  CircleGauge,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type {
  ControlAiRun,
  ControlData,
  ControlHealth,
  ControlIncident,
  ControlIncidentSeverity,
  ControlIntegration,
  ControlOrganization,
  ControlOverview,
  ControlRun,
  ControlRunStatus,
} from "@/lib/control-center/contracts";

const healthLabels: Record<ControlHealth, string> = {
  HEALTHY: "Sain",
  DEGRADED: "Dégradé",
  CRITICAL: "Critique",
  UNKNOWN: "Inconnu",
};

const runLabels: Record<ControlRunStatus, string> = {
  SUCCEEDED: "Réussie",
  RUNNING: "En cours",
  FAILED: "Échouée",
  CANCELLED: "Annulée",
  UNKNOWN: "Inconnue",
};

const severityLabels: Record<ControlIncidentSeverity, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  CRITICAL: "Critique",
  UNKNOWN: "Inconnue",
};

const statusClasses: Record<string, string> = {
  HEALTHY: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  SUCCEEDED: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  RESOLVED: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  RUNNING: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  OPEN: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  INVESTIGATING: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  DEGRADED: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  MEDIUM: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  HIGH: "border-orange-300/20 bg-orange-300/10 text-orange-200",
  CRITICAL: "border-red-300/20 bg-red-300/10 text-red-200",
  FAILED: "border-red-300/20 bg-red-300/10 text-red-200",
  LOW: "border-slate-300/15 bg-slate-300/5 text-slate-300",
  UNKNOWN: "border-slate-300/15 bg-slate-300/5 text-slate-300",
  CANCELLED: "border-slate-300/15 bg-slate-300/5 text-slate-300",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

const moneyFormatters = new Map<string, Intl.NumberFormat>();
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Non disponible";
}

function formatMoney(value: { amount: number; currency: string } | null): string {
  if (!value) return "Non disponible";
  let formatter = moneyFormatters.get(value.currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: value.currency,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(value.currency, formatter);
  }
  return formatter.format(value.amount);
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "En cours / indisponible";
  if (durationMs < 1_000) return `${durationMs} ms`;
  if (durationMs < 60_000) return `${(durationMs / 1_000).toFixed(1)} s`;
  return `${Math.floor(durationMs / 60_000)} min ${Math.round((durationMs % 60_000) / 1_000)} s`;
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-3 leading-7 text-[var(--muted)]">{description}</p>
    </header>
  );
}

function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[value] ?? statusClasses.UNKNOWN}`}>
      {label}
    </span>
  );
}

function UnavailableState({ noun }: { noun: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-amber-300/15 bg-amber-300/5 px-6 py-14 text-center">
      <ShieldAlert className="mx-auto size-9 text-amber-200" />
      <h2 className="mt-4 text-xl font-semibold">Données internes indisponibles</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        {noun} apparaîtront lorsque Core fournira une lecture inter-organisation sécurisée,
        expurgée et auditée. Aucune donnée locataire n’est interrogée en attendant.
      </p>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center">
      <p className="font-medium">Aucun élément</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}

function DataTable<T>({
  rows,
  columns,
  mobileTitle,
}: {
  rows: T[];
  columns: { label: string; render: (row: T) => ReactNode }[];
  mobileTitle: (row: T) => ReactNode;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              <tr>{columns.map((column) => <th key={column.label} className="px-5 py-4 font-medium">{column.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top">
                  {columns.map((column) => <td key={column.label} className="px-5 py-4">{column.render(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:hidden">
        {rows.map((row, rowIndex) => (
          <article key={rowIndex} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="font-medium">{mobileTitle(row)}</div>
            <dl className="mt-4 grid gap-3">
              {columns.slice(1).map((column) => (
                <div key={column.label} className="flex items-start justify-between gap-5 border-t border-[var(--border)] pt-3">
                  <dt className="text-xs text-[var(--muted)]">{column.label}</dt>
                  <dd className="text-right text-sm">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

function ListPage<T>({
  eyebrow,
  title,
  description,
  result,
  unavailableNoun,
  emptyLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  result: ControlData<T[]>;
  unavailableNoun: string;
  emptyLabel: string;
  children: (rows: T[]) => ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {result.status === "unavailable" ? (
        <UnavailableState noun={unavailableNoun} />
      ) : (
        <section className="mt-8" aria-label={title}>
          <p className="mb-4 text-xs text-[var(--muted)]">
            Données générées le {formatDate(result.generatedAt)} · lecture seule
          </p>
          {result.data.length ? children(result.data) : <EmptyState label={emptyLabel} />}
        </section>
      )}
    </div>
  );
}

export function ControlOverviewScreen({ result }: { result: ControlData<ControlOverview> }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="CONTROL CENTER"
        title="Piloter les opérations par exception."
        description="Une vue interne, calme et en lecture seule de la santé des organisations et de l’infrastructure Sesira."
      />
      {result.status === "unavailable" ? (
        <UnavailableState noun="Les indicateurs globaux" />
      ) : (
        <>
          <p className="mt-8 text-xs text-[var(--muted)]">
            {result.data.periodLabel} · généré le {formatDate(result.generatedAt)}
          </p>
          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicateurs opérationnels">
            <MetricCard icon={Building2} label="Organisations" value={result.data.organizationCount.toLocaleString("fr-FR")} />
            <MetricCard icon={CircleGauge} label="Santé des automatisations" value={healthLabels[result.data.automationHealth]} />
            <MetricCard icon={Activity} label="Taux de réussite" value={result.data.automationSuccessRate === null ? "Non disponible" : percentFormatter.format(result.data.automationSuccessRate)} />
            <MetricCard icon={ShieldAlert} label="Incidents ouverts" value={result.data.openIncidentCount.toLocaleString("fr-FR")} />
            <MetricCard icon={Bot} label="Coût IA" value={formatMoney(result.data.aiCost)} />
            <MetricCard icon={CircleDollarSign} label="Coût infrastructure" value={formatMoney(result.data.infrastructureCost)} />
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-6">
      <Icon className="size-5 text-[var(--accent)]" />
      <p className="mt-5 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}

export function ControlOrganizationsScreen({ result }: { result: ControlData<ControlOrganization[]> }) {
  return (
    <ListPage eyebrow="ORGANISATIONS" title="Santé des organisations" description="Modules, connexions et incidents visibles en un seul regard, sans accès aux données métier détaillées." result={result} unavailableNoun="Les organisations" emptyLabel="Aucune organisation à afficher.">
      {(rows) => <DataTable rows={rows} mobileTitle={(row) => row.name} columns={[
        { label: "Organisation", render: (row) => <span className="font-medium">{row.name}</span> },
        { label: "Secteur", render: (row) => row.sector },
        { label: "Modules", render: (row) => row.modules.length ? row.modules.join(", ") : "Aucun" },
        { label: "Santé", render: (row) => <Badge value={row.health} label={healthLabels[row.health]} /> },
        { label: "Intégrations", render: (row) => row.integrationSummary },
        { label: "Incidents", render: (row) => row.openIncidentCount.toLocaleString("fr-FR") },
      ]} />}
    </ListPage>
  );
}

export function ControlRunsScreen({ result }: { result: ControlData<ControlRun[]> }) {
  return (
    <ListPage eyebrow="EXÉCUTIONS" title="Exécutions des automatisations" description="Suivre la réussite, la durée et les problèmes récents sans déclencher ni modifier une exécution." result={result} unavailableNoun="Les exécutions" emptyLabel="Aucune exécution sur la période.">
      {(rows) => <DataTable rows={rows} mobileTitle={(row) => row.automationName} columns={[
        { label: "Automatisation", render: (row) => <span className="font-medium">{row.automationName}</span> },
        { label: "Organisation", render: (row) => row.organizationName },
        { label: "Statut", render: (row) => <Badge value={row.status} label={runLabels[row.status]} /> },
        { label: "Date", render: (row) => formatDate(row.startedAt) },
        { label: "Durée", render: (row) => formatDuration(row.durationMs) },
      ]} />}
    </ListPage>
  );
}

export function ControlAiRunsScreen({ result }: { result: ControlData<ControlAiRun[]> }) {
  return (
    <ListPage eyebrow="EXÉCUTIONS IA" title="Usage des modèles" description="Une lecture agrégée de la qualité, de la latence et du coût. Les entrées et sorties brutes ne sont jamais exposées." result={result} unavailableNoun="Les exécutions IA" emptyLabel="Aucune exécution IA sur la période.">
      {(rows) => <DataTable rows={rows} mobileTitle={(row) => row.feature} columns={[
        { label: "Fonction", render: (row) => <div><p className="font-medium">{row.feature}</p><p className="mt-1 text-xs text-[var(--muted)]">{row.organizationName}</p></div> },
        { label: "Modèle", render: (row) => row.model },
        { label: "Confiance", render: (row) => row.confidence === null ? "Non disponible" : `${(row.confidence * 100).toFixed(0)} %` },
        { label: "Latence", render: (row) => formatDuration(row.latencyMs) },
        { label: "Coût", render: (row) => formatMoney(row.cost) },
        { label: "Statut", render: (row) => <Badge value={row.status} label={runLabels[row.status]} /> },
        { label: "Date", render: (row) => formatDate(row.createdAt) },
      ]} />}
    </ListPage>
  );
}

export function ControlIncidentsScreen({ result }: { result: ControlData<ControlIncident[]> }) {
  return (
    <ListPage eyebrow="INCIDENTS" title="Incidents opérationnels" description="Prioriser les problèmes par organisation, gravité et état, sans contournement de production depuis l’interface." result={result} unavailableNoun="Les incidents" emptyLabel="Aucun incident sur la période.">
      {(rows) => <DataTable rows={rows} mobileTitle={(row) => row.title} columns={[
        { label: "Incident", render: (row) => <div><p className="font-medium">{row.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{row.organizationName}</p></div> },
        { label: "Gravité", render: (row) => <Badge value={row.severity} label={severityLabels[row.severity]} /> },
        { label: "Catégorie", render: (row) => row.category },
        { label: "Statut", render: (row) => <Badge value={row.status} label={row.status === "OPEN" ? "Ouvert" : row.status === "INVESTIGATING" ? "En analyse" : row.status === "RESOLVED" ? "Résolu" : "Inconnu"} /> },
        { label: "Créé", render: (row) => formatDate(row.createdAt) },
        { label: "Mis à jour", render: (row) => formatDate(row.updatedAt) },
      ]} />}
    </ListPage>
  );
}

export function ControlIntegrationsScreen({ result }: { result: ControlData<ControlIntegration[]> }) {
  return (
    <ListPage eyebrow="INTÉGRATIONS" title="Santé des connexions" description="Voir les synchronisations, expirations et problèmes expurgés. Aucun identifiant secret n’est accessible." result={result} unavailableNoun="Les intégrations" emptyLabel="Aucune intégration à afficher.">
      {(rows) => <DataTable rows={rows} mobileTitle={(row) => row.provider} columns={[
        { label: "Fournisseur", render: (row) => <div><p className="font-medium">{row.provider}</p><p className="mt-1 text-xs text-[var(--muted)]">{row.organizationName}</p></div> },
        { label: "Santé", render: (row) => <Badge value={row.health} label={healthLabels[row.health]} /> },
        { label: "Dernière synchro", render: (row) => formatDate(row.lastSyncAt) },
        { label: "Expiration", render: (row) => formatDate(row.expiresAt) },
        { label: "Problème", render: (row) => row.clientSafeProblem ?? "Aucun problème signalé" },
      ]} />}
    </ListPage>
  );
}

export function ControlLoadingScreen() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-label="Chargement du Control Center">
      <div className="h-3 w-32 rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-10 max-w-xl rounded bg-[var(--panel-soft)]" />
      <div className="mt-4 h-5 max-w-2xl rounded bg-[var(--panel-soft)]" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-[var(--panel)]" />)}
      </div>
    </div>
  );
}

export function ControlCenterSafetyNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-sm text-[var(--muted)]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-cyan-200" />
      <p>Les données affichées par le futur adaptateur devront être expurgées, paginées et attribuées à une identité opérateur auditée.</p>
    </div>
  );
}
