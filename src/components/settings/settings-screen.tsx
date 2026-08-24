import {
  BellRing,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CloudDownload,
  Database,
  FileClock,
  Link2,
  LockKeyhole,
  Mail,
  ShieldAlert,
  Trash2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge, type StatusTone } from "@/components/sesira/status-badge";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import {
  formatMemberRole,
  formatMemberStatus,
  type SettingsConnection,
  type SettingsMember,
} from "@/lib/settings/view-model";

type SettingsOrganization = {
  name: string;
  sectorKey: string;
  status: string;
  timezone: string;
  language: string;
  currency: string;
};

const SECTION_LINKS = [
  ["entreprise", "Entreprise", Building2],
  ["equipe", "Équipe", UsersRound],
  ["connexions", "Connexions", Link2],
  ["notifications", "Notifications", BellRing],
  ["donnees", "Données", Database],
  ["facturation", "Facturation", CircleDollarSign],
] as const;

const CONNECTION_TONES: Record<SettingsConnection["tone"], StatusTone> = {
  emerald: "emerald",
  amber: "amber",
  slate: "neutral",
};

export function SettingsScreen({
  organization,
  members,
  connections,
  canManage,
}: {
  organization: SettingsOrganization;
  members: SettingsMember[];
  connections: SettingsConnection[];
  canManage: boolean;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Réglages"
        title="Votre organisation, au même endroit."
        description="Consultez les accès, les connexions et les données de votre entreprise. Les fonctions encore indisponibles sont clairement signalées."
      />

      <nav aria-label="Sections des réglages" className="mt-8 overflow-x-auto pb-2">
        <ul className="flex min-w-max gap-2">
          {SECTION_LINKS.map(([id, label, Icon]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 text-sm text-slate-300 transition hover:border-violet-300/30 hover:text-white"
              >
                <Icon className="size-4 text-violet-300" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 space-y-6">
        <SettingsSection
          id="entreprise"
          icon={Building2}
          eyebrow="ENTREPRISE"
          title="Informations générales"
          description="Ces informations sont utilisées dans toute votre organisation."
        >
          <CompanySettingsForm organization={organization} canManage={canManage} />
        </SettingsSection>

        <SettingsSection
          id="equipe"
          icon={UsersRound}
          eyebrow="ÉQUIPE"
          title="Membres et rôles"
          description="Les rôles existants sont affichés tels qu’ils sont configurés."
        >
          <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
            {members.length ? (
              <ul className="divide-y divide-[var(--border)]">
                {members.map((member) => (
                  <li key={member.id} className="flex flex-col gap-4 bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-400/10 text-sm font-semibold text-violet-200">
                        {initials(member.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {member.name} {member.isCurrentViewer ? <span className="text-violet-300">(vous)</span> : null}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--muted)]">
                          {member.email ?? "Adresse non partagée"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <StatusBadge tone="violet">{formatMemberRole(member.role)}</StatusBadge>
                      <StatusBadge tone="neutral">{formatMemberStatus(member.status)}</StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bg-[var(--background)] p-6 text-sm text-[var(--muted)]">Aucun membre disponible.</p>
            )}
          </div>
          {!canManage ? <PermissionNote text="La gestion de l’équipe est réservée au propriétaire et aux administrateurs." /> : (
            <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
              Les invitations et changements de rôle ne sont pas ouverts depuis cet écran.
            </p>
          )}
        </SettingsSection>

        <SettingsSection
          id="connexions"
          icon={Link2}
          eyebrow="CONNEXIONS"
          title="Services connectés"
          description="Seules les connexions réellement enregistrées sont indiquées comme actives."
        >
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {connections.map((connection) => (
              <article key={connection.key} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--panel-soft)] text-violet-300">
                      {connection.key === "calendar" ? <CalendarDays className="size-5" /> : <Mail className="size-5" />}
                    </span>
                    <div>
                      <h3 className="font-medium">{connection.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{connection.description}</p>
                    </div>
                  </div>
                  <StatusBadge tone={CONNECTION_TONES[connection.tone]}>{connection.status}</StatusBadge>
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--muted)]">
                    {connection.lastSync ? `Dernière synchronisation : ${formatDate(connection.lastSync)}` : "Aucune synchronisation enregistrée"}
                  </p>
                  <button disabled className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-slate-500 disabled:cursor-not-allowed">
                    {connection.hasRecord ? "Gérer bientôt" : "Connexion bientôt disponible"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          id="notifications"
          icon={BellRing}
          eyebrow="NOTIFICATIONS"
          title="Ce qui mérite votre attention"
          description="Les préférences seront enregistrables dès que le service de notifications sera disponible."
        >
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              ["Demande urgente", "Lorsqu’une nouvelle demande nécessite une réponse rapide."],
              ["Réponse à un devis", "Lorsqu’un client répond à un devis envoyé."],
              ["Objection prix", "Lorsqu’une discussion commerciale porte sur le prix."],
              ["Incident d’automatisation", "Lorsqu’un processus activé rencontre un problème."],
            ].map(([title, description]) => (
              <div key={title} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div>
                  <h3 className="text-sm font-medium">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
                </div>
                <span aria-label="Préférence indisponible" className="mt-1 h-6 w-11 shrink-0 rounded-full border border-slate-600 bg-slate-800 opacity-60">
                  <span className="m-0.5 block size-5 rounded-full bg-slate-500" />
                </span>
              </div>
            ))}
          </div>
          <UnavailableNote text="Préférences non enregistrables pour le moment. Aucun réglage affiché ici n’est appliqué." />
        </SettingsSection>

        <SettingsSection
          id="donnees"
          icon={Database}
          eyebrow="DONNÉES"
          title="Contrôle de vos données"
          description="Les actions sensibles restent bloquées tant que leur traitement sécurisé n’est pas disponible."
        >
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <DataCard
              icon={CloudDownload}
              title="Exporter les données"
              description="Préparer une copie des données de votre organisation."
              action="Préparer un export"
            />
            <DataCard
              icon={FileClock}
              title="Conservation"
              description="Politique de conservation non configurée. Aucune durée n’est supposée par cet écran."
              action="Voir la politique"
            />
            <DataCard
              icon={Trash2}
              title="Suppression"
              description="Une demande contrôlée avec confirmation sera nécessaire. Rien n’est supprimé ici."
              action="Demander la suppression"
              danger
            />
          </div>
          <UnavailableNote text="Export, conservation et suppression attendent un traitement sécurisé et contrôlé. Les boutons sont volontairement désactivés." />
        </SettingsSection>

        <SettingsSection
          id="facturation"
          icon={CircleDollarSign}
          eyebrow="FACTURATION"
          title="Plan et facturation"
          description="Aucun moyen de paiement ni abonnement n’est simulé."
        >
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 md:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-violet-300">PLAN</p>
                <h3 className="mt-2 text-xl font-semibold">Informations indisponibles</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  L’état réel de votre organisation est « {formatOrganizationStatus(organization.status)} ».
                  Aucun plan commercial, prix ou renouvellement n’est encore connecté.
                </p>
              </div>
              <StatusBadge tone="neutral">Pas de facturation active</StatusBadge>
            </div>
            <button disabled className="mt-6 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-slate-500 disabled:cursor-not-allowed">
              Gérer la facturation
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ id, icon: Icon, eyebrow, title, description, children }: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 md:p-7" aria-labelledby={`${id}-title`}>
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-1 text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function DataCard({ icon: Icon, title, description, action, danger = false }: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  danger?: boolean;
}) {
  return (
    <article className={`rounded-xl border p-5 ${danger ? "border-rose-300/15 bg-rose-300/5" : "border-[var(--border)] bg-[var(--background)]"}`}>
      <Icon className={`size-5 ${danger ? "text-rose-300" : "text-violet-300"}`} />
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 min-h-16 text-xs leading-5 text-[var(--muted)]">{description}</p>
      <button disabled className={`mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border-rose-300/20 text-rose-200" : "border-[var(--border)] text-slate-300"}`}>
        {action}<ChevronRight className="size-3.5" />
      </button>
    </article>
  );
}

function PermissionNote({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4 text-xs leading-5 text-[var(--muted)]">
      <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-300" />{text}
    </div>
  );
}

function UnavailableNote({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-xs leading-5 text-[var(--muted)]">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-cyan-300" />{text}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatOrganizationStatus(status: string) {
  return ({ TRIAL: "Essai", ACTIVE: "Actif", SUSPENDED: "Suspendu", ARCHIVED: "Archivé" } as Record<string, string>)[status] ?? "Non renseigné";
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("fr-FR") || "M";
}
