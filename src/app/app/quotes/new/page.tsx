import { ArrowLeft, ReceiptText, UserPlus } from "lucide-react";
import Link from "next/link";

import { QuoteForm } from "@/components/quotes/quote-form";
import { EmptyState } from "@/components/sesira/empty-state";
import { PageHeader } from "@/components/sesira/page-header";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type NewQuoteSearchParams = Promise<{ customerId?: string; requestId?: string }>;

export default async function NewQuotePage({ searchParams }: { searchParams: NewQuoteSearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);

  if (!viewer) {
    return null;
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [customersResult, requestsResult, membersResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, display_name, company_name")
      .eq("organization_id", organizationId)
      .order("display_name")
      .limit(500),
    supabase
      .from("requests")
      .select("id, title, customer_id, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("status", "ACTIVE"),
  ]);

  if (customersResult.error || requestsResult.error || membersResult.error) {
    throw new Error("Impossible de préparer la création du devis.");
  }

  const customers = customersResult.data ?? [];
  const requests = requestsResult.data ?? [];
  const members = membersResult.data ?? [];
  const profileResult = members.length
    ? await supabase.from("profiles").select("id, full_name").in("id", members.map((member) => member.user_id))
    : { data: [], error: null };

  if (profileResult.error) {
    throw new Error("Impossible de charger les membres de votre équipe.");
  }

  const profileNames = Object.fromEntries((profileResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const requestedRequest = requests.find((request) => request.id === params.requestId);
  const requestedCustomerId = requestedRequest?.customer_id ?? params.customerId ?? "";
  const defaultCustomerId = customers.some((customer) => customer.id === requestedCustomerId) ? requestedCustomerId : "";
  const defaultRequestId = requestedRequest?.customer_id === defaultCustomerId ? requestedRequest.id : "";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app/quotes" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white">
        <ArrowLeft className="size-4" />
        Tous les devis
      </Link>

      <div className="mt-8">
        <PageHeader
          eyebrow="Suivi commercial"
          title="Nouveau devis"
          description="Reliez le devis à un client, puis ajoutez les informations utiles à son suivi."
        />
      </div>

      <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 md:p-8">
        {customers.length ? (
          <QuoteForm
            customers={customers.map((customer) => ({
              id: customer.id,
              label: customer.company_name ? `${customer.display_name} · ${customer.company_name}` : customer.display_name,
            }))}
            requests={requests.map((request) => ({
              id: request.id,
              customerId: request.customer_id,
              label: request.title,
            }))}
            owners={members.map((member) => ({
              id: member.user_id,
              label: member.user_id === viewer.userId
                ? "Vous"
                : profileNames[member.user_id] ?? `Membre · ${member.role.toLowerCase()}`,
            }))}
            defaultCustomerId={defaultCustomerId}
            defaultRequestId={defaultRequestId}
            defaultOwnerId={viewer.userId}
          />
        ) : (
          <EmptyState
            contained={false}
            icon={ReceiptText}
            title="Ajoutez d’abord un client"
            description="Chaque devis doit être rattaché à un client de votre organisation."
            action={
              <Link href="/app/customers/new" className="sesira-primary-action px-5">
                <UserPlus className="size-4" />Créer un client
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
