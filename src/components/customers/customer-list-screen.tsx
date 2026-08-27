import {
  ArrowRight,
  Building2,
  CalendarPlus,
  ChevronRight,
  ContactRound,
  Mail,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/sesira/empty-state";
import { FilterBar, filterSelectClassName, SearchField } from "@/components/sesira/filter-bar";
import { MetricCard } from "@/components/sesira/metric-card";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge } from "@/components/sesira/status-badge";
import { customerInitials, formatCustomerDate } from "@/lib/customers/format";

export type CustomerListItem = {
  id: string;
  type: string;
  display_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type CustomerStats = {
  total: number;
  companies: number;
  recent: number;
};

export function CustomerListScreen({
  customers,
  stats,
  query = "",
  type = "ALL",
  nextCursor,
}: {
  customers: CustomerListItem[];
  stats: CustomerStats;
  query?: string;
  type?: "ALL" | "PERSON" | "COMPANY";
  nextCursor?: string;
}) {
  const hasFilters = Boolean(query) || type !== "ALL";
  const nextPageUrl = nextCursor
    ? `/app/customers?${new URLSearchParams({
        ...(query ? { q: query } : {}),
        ...(type !== "ALL" ? { type } : {}),
        cursor: nextCursor,
      }).toString()}`
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Relation client"
        title="Clients"
        description="Une vue fiable de chaque client, de ses demandes et de son activité commerciale."
        actions={
          <Link href="/app/customers/new" className="sesira-primary-action px-5">
            <Plus className="size-4" />
            Nouveau client
          </Link>
        }
      />

      <section className="sesira-metric-grid mt-6 sm:grid-cols-3">
        <MetricCard icon={Users} label="Clients" value={stats.total} tone="violet" />
        <MetricCard icon={Building2} label="Entreprises" value={stats.companies} tone="cyan" />
        <MetricCard icon={CalendarPlus} label="Nouveaux ce mois" value={stats.recent} tone="emerald" />
      </section>

      <section className="mt-6 overflow-hidden  border border-[var(--border)] bg-[var(--panel)]">
        <FilterBar action="/app/customers" layoutClassName="md:grid-cols-[minmax(220px,1fr)_176px_auto]">
          <SearchField label="Rechercher un client" defaultValue={query} placeholder="Rechercher par nom…" />
          <label>
            <span className="sr-only">Filtrer par type</span>
            <select
              name="type"
              defaultValue={type}
              className={filterSelectClassName}
            >
              <option value="ALL">Tous les types</option>
              <option value="PERSON">Particuliers</option>
              <option value="COMPANY">Entreprises</option>
            </select>
          </label>
          <button className="sesira-secondary-action bg-[var(--panel-soft)] px-5">
            Filtrer
          </button>
        </FilterBar>

        {customers.length ? (
          <div>
            <div className="hidden grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_140px_120px_32px] gap-4 border-b border-[var(--line)] px-[1.375rem] py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-mute)] lg:grid">
              <span>Client</span>
              <span>Contact</span>
              <span>Type</span>
              <span>Créé le</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--line-soft)]">
              {customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/app/customers/${customer.id}`}
                  className="group grid gap-4 px-[1.375rem] py-[0.9375rem] transition hover:bg-[#f7f9fa] lg:grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_140px_120px_32px] lg:items-center"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="sesira-avatar grid size-10 shrink-0 place-items-center bg-[var(--blue-soft)] text-sm font-semibold text-[var(--blue)]">
                      {customerInitials(customer.display_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--ink)]">{customer.display_name}</span>
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                        {customer.company_name ?? "Client indépendant"}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 text-sm text-[var(--ink)]">
                    <span className="flex items-center gap-2 truncate">
                      <Mail className="size-3.5 shrink-0 text-[var(--ink-mute)]" />
                      {customer.email ?? customer.phone ?? "Coordonnées à compléter"}
                    </span>
                  </span>
                  <span>
                    <CustomerTypeBadge type={customer.type} />
                  </span>
                  <span className="text-sm text-[var(--muted)]">{formatCustomerDate(customer.created_at)}</span>
                  <ChevronRight className="hidden size-4 text-[var(--ink-mute)] transition group-hover:translate-x-0.5 group-hover:text-[var(--blue)] lg:block" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            contained={false}
            icon={ContactRound}
            title={hasFilters ? "Aucun client ne correspond à ces filtres." : "Votre portefeuille client est vide."}
            description={
              hasFilters
                ? "Modifiez la recherche ou réinitialisez les filtres."
                : "Ajoutez votre premier client pour centraliser ses demandes, devis et échanges."
            }
            action={
              <Link href={hasFilters ? "/app/customers" : "/app/customers/new"} className="sesira-secondary-action">
                {hasFilters ? "Réinitialiser" : "Créer un client"}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        )}

        {customers.length ? (
          <footer className="flex items-center justify-between border-t border-[var(--line)] px-[1.375rem] py-4 text-[0.8125rem]">
            <span className="text-[var(--ink-mute)]">1 – {customers.length} sur {stats.total}</span>
            <div className="flex items-center gap-5">
              <Link href="/app/customers" className="text-[var(--ink-soft)] transition hover:text-[var(--blue)]">Précédent</Link>
              {nextPageUrl ? <Link href={nextPageUrl} className="font-semibold text-[var(--blue)]">Suivant</Link> : <span className="text-[var(--ink-mute)]">Suivant</span>}
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function CustomerTypeBadge({ type }: { type: string }) {
  const company = type === "COMPANY";
  return (
    <StatusBadge tone={company ? "cyan" : "violet"}>
      {company ? "Entreprise" : "Particulier"}
    </StatusBadge>
  );
}
