import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { RequestForm } from "@/components/requests/request-form";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type NewRequestSearchParams = Promise<{ customerId?: string }>;

export default async function NewRequestPage({ searchParams }: { searchParams: NewRequestSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [customersResult, servicesResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, display_name, company_name")
      .eq("organization_id", organizationId)
      .order("display_name")
      .limit(100),
    supabase
      .from("service_catalog_items")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name")
      .limit(100),
  ]);

  if (customersResult.error || servicesResult.error) {
    throw new Error("Impossible de préparer cette nouvelle demande.");
  }

  const customers = customersResult.data ?? [];
  const services = servicesResult.data ?? [];
  const defaultCustomerId = customers.some((customer) => customer.id === params.customerId)
    ? params.customerId
    : "";
  const cancelHref = defaultCustomerId ? `/app/customers/${defaultCustomerId}` : "/app/requests";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={cancelHref}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Retour aux demandes
      </Link>

      <header className="mt-8">
        <p className="text-sm font-medium text-[var(--accent)]">Nouvelle demande</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Ajouter une demande</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Reliez le besoin à un client existant et notez uniquement les informations utiles pour commencer.
        </p>
      </header>

      {customers.length ? (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
          <div className="mb-8 flex gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-cyan-300" />
            <p className="leading-6">
              La demande restera dans votre organisation et sa création sera ajoutée automatiquement au journal d’activité.
            </p>
          </div>
          <RequestForm
            customers={customers.map((customer) => ({
              id: customer.id,
              label: customer.company_name
                ? `${customer.display_name} — ${customer.company_name}`
                : customer.display_name,
            }))}
            services={services.map((service) => ({ id: service.id, label: service.name }))}
            defaultCustomerId={defaultCustomerId}
            cancelHref={cancelHref}
          />
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-6 py-14 text-center">
          <Plus className="mx-auto size-9 text-violet-300" />
          <h2 className="mt-5 text-lg font-semibold">Ajoutez d’abord un client</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Chaque nouvelle demande doit être reliée à un client existant.
          </p>
          <Link
            href="/app/customers/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Créer un client
          </Link>
        </section>
      )}
    </div>
  );
}
