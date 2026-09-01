import Link from "next/link";

/* eslint-disable react/no-unescaped-entities */

import { attentionCategoryLabel, attentionPriorityLabels } from "@/lib/attention/format";
import type { AttentionPriority } from "@/lib/attention/schema";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const supabase = await createClient();
  const attention = await supabase
    .from("attention_items")
    .select("id, category, priority, title, explanation, created_at")
    .eq("organization_id", viewer.organization.id)
    .in("status", ["OPEN", "IN_PROGRESS"])
    .order("created_at", { ascending: true });
  const items = attention.data ?? [];

  return (
    <div className="dashboard-ref">
      <h1>À traiter</h1>
      <p className="dashboard-ref-summary">{items.length ? `${items.length} situation${items.length > 1 ? "s" : ""} demande${items.length > 1 ? "nt" : ""} votre décision.` : "Rien ne demande votre décision pour le moment."}<br />Sesira continue de surveiller vos dossiers.</p>
      <div className="dashboard-ref-filters"><nav aria-label="Filtrer les situations"><span className="active">Tout · {items.length}</span><span>Prix</span><span>Réclamation</span><span>Autre</span></nav><p>Trié par ancienneté</p></div>
      {items.length ? <div className="dashboard-ref-list">{items.map((item) => <article key={item.id}><header><span>{attentionCategoryLabel(item.category)}</span><small>Priorité {attentionPriorityLabels[item.priority as AttentionPriority]?.toLocaleLowerCase("fr-FR") ?? "à vérifier"}</small></header><div><h2>{item.title}</h2><p className="dashboard-ref-date">Remonté {formatDate(item.created_at)}</p><small>Pourquoi Sesira vous le montre</small><p>{item.explanation ?? "Cette situation nécessite une décision humaine."}</p><div className="dashboard-ref-actions"><Link href="/app/attention">Répondre moi-même</Link><Link href="/app/attention" className="secondary">Voir le dossier</Link></div></div></article>)}</div> : <section className="dashboard-ref-empty"><h2>Rien à traiter.</h2><p>Sesira surveille vos dossiers. Vous serez prévenu dès qu'une décision humaine sera nécessaire.</p><Link href="/app/reports">Voir l'activité</Link></section>}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(value));
}
