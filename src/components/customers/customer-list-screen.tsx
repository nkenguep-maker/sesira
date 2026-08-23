import {
  ArrowRight,
  Building2,
  CalendarPlus,
  ChevronRight,
  ContactRound,
  Mail,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

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
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Relation client</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Clients</h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Une vue fiable de chaque client, de ses demandes et de son activité commerciale.
          </p>
        </div>
        <Link
          href="/app/customers/new"
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 lg:self-auto"
        >
          <Plus className="size-4" />
          Nouveau client
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Clients" value={stats.total} tone="violet" />
        <StatCard icon={Building2} label="Entreprises" value={stats.companies} tone="cyan" />
        <StatCard icon={CalendarPlus} label="Nouveaux ce mois" value={stats.recent} tone="emerald" />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <form className="flex flex-col gap-3 border-b border-[var(--border)] p-4 md:flex-row" action="/app/customers">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Rechercher un client</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Rechercher par nom…"
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par type</span>
            <select
              name="type"
              defaultValue={type}
              className="w-full rounded-xl border border-[var(--border)] bg-[#0a0e18] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400 md:w-44"
            >
              <option value="ALL">Tous les types</option>
              <option value="PERSON">Particuliers</option>
              <option value="COMPANY">Entreprises</option>
            </select>
          </label>
          <button className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-2.5 text-sm font-medium text-white transition hover:border-slate-500">
            Filtrer
          </button>
        </form>

        {customers.length ? (
          <div>
            <div className="hidden grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_140px_120px_32px] gap-4 border-b border-[var(--border)] px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 md:grid">
              <span>Client</span>
              <span>Contact</span>
              <span>Type</span>
              <span>Créé le</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--border)]">
              {customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/app/customers/${customer.id}`}
                  className="group grid gap-4 px-5 py-4 transition hover:bg-[var(--panel-soft)] md:grid-cols-[minmax(260px,1.5fr)_minmax(180px,1fr)_140px_120px_32px] md:items-center"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-sm font-semibold text-violet-200">
                      {customerInitials(customer.display_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">{customer.display_name}</span>
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                        {customer.company_name ?? "Client indépendant"}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 text-sm text-slate-300">
                    <span className="flex items-center gap-2 truncate">
                      <Mail className="size-3.5 shrink-0 text-slate-500" />
                      {customer.email ?? customer.phone ?? "Coordonnées à compléter"}
                    </span>
                  </span>
                  <span>
                    <CustomerTypeBadge type={customer.type} />
                  </span>
                  <span className="text-sm text-[var(--muted)]">{formatCustomerDate(customer.created_at)}</span>
                  <ChevronRight className="hidden size-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300 md:block" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <ContactRound className="mx-auto size-9 text-violet-300" />
            <p className="mt-5 font-medium">
              {hasFilters ? "Aucun client ne correspond à ces filtres." : "Votre portefeuille client est vide."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {hasFilters
                ? "Modifiez la recherche ou réinitialisez les filtres."
                : "Ajoutez votre premier client pour centraliser ses demandes, devis et échanges."}
            </p>
            <Link
              href={hasFilters ? "/app/customers" : "/app/customers/new"}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--panel-soft)]"
            >
              {hasFilters ? "Réinitialiser" : "Créer un client"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {customers.length ? (
          <footer className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4 text-sm">
            <Link href="/app/customers" className="text-[var(--muted)] transition hover:text-white">
              Retour au début
            </Link>
            {nextPageUrl ? (
              <Link href={nextPageUrl} className="inline-flex items-center gap-2 font-medium text-violet-300 hover:text-violet-200">
                Page suivante <ArrowRight className="size-4" />
              </Link>
            ) : (
              <span className="text-slate-600">Fin de la liste</span>
            )}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function CustomerTypeBadge({ type }: { type: string }) {
  const company = type === "COMPANY";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        company
          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
          : "border-violet-400/20 bg-violet-400/10 text-violet-200"
      }`}
    >
      {company ? "Entreprise" : "Particulier"}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "violet" | "cyan" | "emerald";
}) {
  const tones = {
    violet: "bg-violet-400/10 text-violet-200",
    cyan: "bg-cyan-400/10 text-cyan-200",
    emerald: "bg-emerald-400/10 text-emerald-200",
  };

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <span className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-2xl font-semibold tracking-tight">{value}</span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">{label}</span>
      </span>
    </article>
  );
}
