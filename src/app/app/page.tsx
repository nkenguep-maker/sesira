import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, FileText, Users } from "lucide-react";

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
    { label: "Clients", value: customers.count ?? 0, icon: Users, accent: "text-violet-300" },
    { label: "Demandes", value: requests.count ?? 0, icon: FileText, accent: "text-cyan-300" },
    { label: "Devis surveillés", value: quotes.count ?? 0, icon: Clock3, accent: "text-blue-300" },
    { label: "À traiter", value: attention.count ?? 0, icon: AlertTriangle, accent: "text-amber-300" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Aujourd’hui</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Bonjour{viewer.email ? `, ${viewer.email.split("@")[0]}` : ""}.
          </h1>
          <p className="mt-3 text-[var(--muted)]">Voici ce qui se passe dans votre entreprise.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 sm:self-auto">
          <CheckCircle2 className="size-3.5" />
          Actions externes {externalActionsEnabled ? "activées" : "désactivées"}
        </div>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, accent }) => (
          <article key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--muted)]">{label}</p>
              <Icon className={`size-4 ${accent}`} />
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="font-semibold">À traiter</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Les situations qui demandent une décision humaine.</p>
          </div>
          <a href="/app/attention" className="flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200">
            Tout voir <ArrowUpRight className="size-4" />
          </a>
        </div>

        {recentAttention.data?.length ? (
          <div className="divide-y divide-[var(--border)]">
            {recentAttention.data.map((item) => (
              <article key={item.id} className="grid gap-3 px-6 py-5 md:grid-cols-[130px_1fr_auto] md:items-center">
                <span className="text-xs font-semibold tracking-wide text-amber-300">{item.priority}</span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.explanation ? <p className="mt-1 text-sm text-[var(--muted)]">{item.explanation}</p> : null}
                </div>
                <span className="text-xs text-[var(--muted)]">{item.category}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto size-8 text-emerald-300" />
            <p className="mt-4 font-medium">Rien ne nécessite votre attention.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Les exceptions détectées par Sesira apparaîtront ici.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
