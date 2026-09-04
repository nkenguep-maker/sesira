import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getPlatformWorkspace } from "@/lib/data/c40-ui";

import { togglePlatformComponentAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string }>;

export default async function PlatformStatePage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  if (!["OWNER", "ADMIN"].includes(viewer.role)) {
    return <><PageHeader eyebrow="PILOTAGE" title="État SESIRA" description="État technique des services de votre espace." /><section className="app-state-message"><strong>Accès réservé</strong><p>Seuls les propriétaires et administrateurs voient les détails techniques et les arrêts manuels.</p></section></>;
  }
  const workspace = await getPlatformWorkspace(viewer.organization.id);
  if (workspace.status === "ERROR") {
    return <><PageHeader eyebrow="PILOTAGE" title="État SESIRA" description="État technique des services de votre espace." /><section className="app-state-message"><strong>État indisponible</strong><p>SESIRA ne peut pas lire ses mesures techniques pour le moment. Aucun score de remplacement n’est affiché.</p></section></>;
  }
  const rows = workspace.data;
  return (
    <>
      <PageHeader eyebrow="PILOTAGE" title="État SESIRA" description="Mesures brutes des services réellement enregistrés : succès, erreurs, latence et files d’attente. Aucun score de santé synthétique n’est inventé." />
      <ResultNotice result={params.result} />
      <section className="workspace-stat-strip"><div><strong>{rows.filter((row) => row.status === "ENABLED").length}</strong><span>Actifs</span></div><div><strong>{rows.filter((row) => row.status === "DEGRADED").length}</strong><span>Dégradés</span></div><div><strong>{rows.filter((row) => row.status.startsWith("DISABLED")).length}</strong><span>Désactivés</span></div><div><strong>{rows.reduce((sum, row) => sum + row.errorsLastHour, 0)}</strong><span>Erreurs · 1 h</span></div></section>
      <section className="workspace-boundary-note"><StatusPill>Mesures observées</StatusPill><p>Une absence de heartbeat, de latence ou de backlog reste une donnée absente. Elle n’est pas remplacée par zéro sauf lorsqu’un compteur du service est explicitement retourné à zéro.</p></section>
      {rows.length ? <section className="workspace-list">{rows.map((row) => <article className="workspace-row" key={row.id}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{componentLabel(row.kind)}</span><h2>{row.label}</h2></div><StatusPill tone={row.status === "ENABLED" ? "good" : row.status === "DEGRADED" ? "warning" : "neutral"}>{componentStatus(row.status)}</StatusPill></div><div className="workspace-meta"><span><b>Dernier succès</b>{row.lastSuccessAt ? formatDateTime(row.lastSuccessAt) : "Non disponible"}</span><span><b>Dernière erreur</b>{row.lastErrorAt ? formatDateTime(row.lastErrorAt) : "Aucune enregistrée"}</span><span><b>Succès · 1 h</b>{row.successesLastHour}</span><span><b>Erreurs · 1 h</b>{row.errorsLastHour}</span><span><b>Relances techniques · 1 h</b>{row.retriesLastHour}</span><span><b>Latence moyenne · 1 h</b>{row.avgLatencyMs === null ? "Non disponible" : `${Math.round(row.avgLatencyMs)} ms`}</span><span><b>File d’attente</b>{row.backlogSize === null ? "Non mesurée" : row.backlogSize}</span><span><b>Région</b>{row.region ?? "Non renseignée"}</span></div>{row.lastErrorMessage ? <div className="workspace-gap-box"><strong>Dernière erreur enregistrée</strong><p>{row.lastErrorMessage}</p></div> : null}{row.statusReason ? <p className="workspace-description">Raison de l’état : {row.statusReason}</p> : null}</div><div className="workspace-row-actions"><form action={togglePlatformComponentAction} className="workspace-inline-form compact"><input type="hidden" name="componentKind" value={row.kind} /><input type="hidden" name="intent" value={row.status.startsWith("DISABLED") ? "enable" : "disable"} /><label><span>Motif obligatoire</span><input name="reason" maxLength={1000} required placeholder={row.status.startsWith("DISABLED") ? "Pourquoi réactiver ce service" : "Pourquoi arrêter ce service"} /></label><button className={row.status.startsWith("DISABLED") ? "button primary small" : "button ghost small"} type="submit">{row.status.startsWith("DISABLED") ? "Réactiver" : "Arrêter ce service"}</button></form></div></article>)}</section> : <EmptyState title="Aucun service enregistré" description="Aucun composant technique n’est actuellement exposé par le tableau de bord C38." />}
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; const good = ["disabled", "enabled"].includes(result); const copy: Record<string, string> = { disabled: "L’arrêt manuel a été enregistré.", enabled: "La réactivation a été enregistrée.", forbidden: "Cette action est réservée aux propriétaires et administrateurs.", invalid: "Un service et un motif sont requis.", "not-applied": "Le changement n’a pas été confirmé par SESIRA." }; return <section className="premium-inline-notice"><StatusPill tone={good ? "good" : "warning"}>{good ? "Enregistré" : "Non appliqué"}</StatusPill><p>{copy[result] ?? "État inconnu."}</p></section>; }
function componentLabel(value: string) { return ({ EMAIL: "Emails", AI_MISTRAL: "IA", DOCUMENTS: "Documents", VOICE: "Téléphonie", EINVOICING: "Facturation électronique", GROWTH: "Croissance", AUTOMATIONS: "Automatisations", WEBHOOKS: "Échanges entrants", QUEUES: "Files de traitement", DATABASE: "Base de données", STORAGE: "Stockage", REGULATORY: "Obligations CVC" } as Record<string, string>)[value] ?? "Service"; }
function componentStatus(value: string) { return ({ ENABLED: "Fonctionne", DEGRADED: "Dégradé", DISABLED_MANUAL: "Arrêté manuellement", DISABLED_INCIDENT: "Arrêté après incident" } as Record<string, string>)[value] ?? value; }
function formatDateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d); }
