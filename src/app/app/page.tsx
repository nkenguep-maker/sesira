import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, FileText, Users } from "lucide-react";

import { EmptyState } from "@/components/sesira/empty-state";
import { MetricCard, type MetricTone } from "@/components/sesira/metric-card";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge } from "@/components/sesira/status-badge";
import { attentionCategoryLabel, attentionPriorityLabels } from "@/lib/attention/format";
import type { AttentionPriority } from "@/lib/attention/schema";
import { getViewerContext } from "@/lib/auth/viewer";
import { areExternalActionsEnabled } from "@/lib/automation/external-actions";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewerContext();

  if (!viewer) {
    return null;
  }

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const externalActionsEnabled = areExternalActionsEnabled({
    configuredValue: serverEnv.EXTERNAL_ACTIONS_ENABLED,
    deploymentEnvironment: process.env.VERCEL_ENV as "development" | "preview" | "production" | undefined,
  });

  const [customers, requests, quotes, attention, recentAttention] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]),
    supabase
      .from("attention_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["OPEN", "IN_PROGRESS"]),
    supabase
      .from("attention_items")
      .select("id, category, priority, title, explanation, created_at")
      .eq("organization_id", organizationId)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const metrics = [
    { label: "Clients", value: customers.count ?? 0, icon: Users, tone: "violet" },
    { label: "Demandes", value: requests.count ?? 0, icon: FileText, tone: "cyan" },
    { label: "Devis surveillés", value: quotes.count ?? 0, icon: Clock3, tone: "blue" },
    { label: "À traiter", value: attention.count ?? 0, icon: AlertTriangle, tone: "amber" },
  ] satisfies Array<{ label: string; value: number; icon: typeof Users; tone: MetricTone }>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Aujourd’hui"
        title={`Bonjour${viewer.email ? `, ${viewer.email.split("@")[0]}` : ""}.`}
        description="Voici ce qui se passe dans votre entreprise."
        actions={
          <StatusBadge tone={externalActionsEnabled ? "emerald" : "neutral"}>
            <CheckCircle2 className="mr-1.5 size-3.5" />
            Actions vers l’extérieur {externalActionsEnabled ? "activées" : "désactivées"}
          </StatusBadge>
        }
      />

      <section className="sesira-metric-grid mt-6 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon, tone }) => (
          <MetricCard key={label} icon={icon} label={label} value={value} tone={tone} layout="stacked" />
        ))}
      </section>

      <section className="mt-6  border border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="font-semibold">À traiter</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Les situations qui demandent une décision humaine.</p>
          </div>
          <a href="/app/attention" className="flex items-center gap-2 text-sm text-[var(--blue)] hover:text-[var(--blue)]">
            Tout voir <ArrowUpRight className="size-4" />
          </a>
        </div>

        {recentAttention.data?.length ? (
          <div className="divide-y divide-[var(--border)]">
            {recentAttention.data.map((item) => (
              <article key={item.id} className="grid gap-3 px-6 py-5 md:grid-cols-[130px_1fr_auto] md:items-center">
                <span className="text-xs font-semibold tracking-wide text-[var(--sand-text)]">
                  Priorité {attentionPriorityLabels[item.priority as AttentionPriority]?.toLocaleLowerCase("fr-FR") ?? "à vérifier"}
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.explanation ? <p className="mt-1 text-sm text-[var(--muted)]">{item.explanation}</p> : null}
                </div>
                <span className="text-xs text-[var(--muted)]">{attentionCategoryLabel(item.category)}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            contained={false}
            icon={CheckCircle2}
            tone="emerald"
            title="Rien ne nécessite votre attention."
            description="Les situations importantes détectées par Sesira apparaîtront ici."
          />
        )}
      </section>
    </div>
  );
}
