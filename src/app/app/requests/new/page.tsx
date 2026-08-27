import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { RequestForm } from "@/components/requests/request-form";
import { EmptyState } from "@/components/sesira/empty-state";
import { PageHeader } from "@/components/sesira/page-header";
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
    <div className="mx-auto max-w-[704px]">
      <Link
        href={cancelHref}
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--blue)]"
      >
        <ArrowLeft className="size-4" />
        Retour aux demandes
      </Link>

      <div className="mt-8">
        <PageHeader
          eyebrow="Nouvelle demande"
          title="Ajouter une demande"
          description="Reliez le besoin à un client existant et notez uniquement les informations utiles pour commencer."
        />
      </div>

      {customers.length ? (
        <section className="mt-8  border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
          <div className="mb-8 flex gap-3 border-l-2 border-[var(--blue)] bg-[var(--blue-soft)] p-4 text-sm text-[var(--ink-soft)]">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--blue)]" />
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
        <section className="mt-8">
          <EmptyState
            icon={Plus}
            title="Ajoutez d’abord un client"
            description="Chaque nouvelle demande doit être reliée à un client existant."
            action={<Link href="/app/customers/new" className="sesira-primary-action px-5">Créer un client</Link>}
          />
        </section>
      )}
    </div>
  );
}
