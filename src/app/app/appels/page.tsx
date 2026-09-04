import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getVoiceWorkspace } from "@/lib/data/c40-ui";

import { saveVoicePolicyAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string }>;

export default async function CallsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const workspace = await getVoiceWorkspace(viewer.organization.id);
  if (workspace.status === "ERROR") {
    return <><PageHeader eyebrow="ACCUEIL TÉLÉPHONIQUE" title="Appels" description="Appels entrants et politique d’information." /><section className="app-state-message"><strong>Appels indisponibles</strong><p>SESIRA ne peut pas lire ce module pour le moment.</p></section></>;
  }
  const { policy, calls } = workspace.data;
  const pending = calls.filter((call) => !["CLOSED", "FAILED", "OPTED_OUT"].includes(call.status)).length;

  return (
    <>
      <PageHeader eyebrow="ACCUEIL TÉLÉPHONIQUE" title="Appels" description="Suivi des appels enregistrés par le service connecté. SESIRA n’évalue ni l’émotion, ni la fiabilité, ni la solvabilité d’un appelant." />
      <ResultNotice result={params.result} />
      <section className="workspace-stat-strip"><div><strong>{calls.length}</strong><span>Appels enregistrés</span></div><div><strong>{pending}</strong><span>À terminer</span></div><div><strong>{calls.filter((call) => call.optOutAt).length}</strong><span>Refus d’enregistrement</span></div><div><strong>{policy?.regionEuropeVerified ? "Vérifiée" : "Non vérifiée"}</strong><span>Région Europe</span></div></section>

      <section className="workspace-boundary-note"><StatusPill tone={policy?.regionEuropeVerified ? "good" : "warning"}>Hébergement Europe</StatusPill><p>{policy?.regionEuropeVerified ? `La vérification opérateur est enregistrée${policy.regionVerifiedAt ? ` depuis le ${formatDate(policy.regionVerifiedAt)}` : ""}.` : "La région Europe n’est pas attestée dans SESIRA. Cette interface ne peut pas valider elle-même cette vérification."}</p></section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">INFORMATION & CONSERVATION</span><h2>Politique d’appel</h2></div><StatusPill tone={policy ? "good" : "warning"}>{policy ? "Configurée" : "À configurer"}</StatusPill></div>
        {policy ? <div className="premium-data-list"><div><span>Information IA</span><strong>{policy.aiDisclosureMessage}</strong></div><div><span>Information enregistrement</span><strong>{policy.recordingNoticeMessage}</strong></div><div><span>Conservation audio</span><strong>{policy.retentionRecordingDays} jours</strong></div><div><span>Conservation transcription</span><strong>{policy.retentionTranscriptDays} jours</strong></div><div><span>En cas de refus</span><strong>{optOutLabel(policy.optOutBehavior)}</strong></div></div> : <p className="premium-muted-copy">Aucune politique d’appel n’est enregistrée.</p>}
        {["OWNER", "ADMIN"].includes(viewer.role) ? <form action={saveVoicePolicyAction} className="settings-stack"><label className="panel"><span className="eyebrow">MESSAGE D’INFORMATION IA</span><textarea name="aiDisclosureMessage" rows={3} required defaultValue={policy?.aiDisclosureMessage ?? "Vous échangez avec un assistant automatisé de notre entreprise."} /></label><label className="panel"><span className="eyebrow">INFORMATION ENREGISTREMENT</span><textarea name="recordingNoticeMessage" rows={3} required defaultValue={policy?.recordingNoticeMessage ?? "Cet appel peut être enregistré afin de traiter votre demande. Vous pouvez refuser l’enregistrement."} /></label><div className="premium-connection-grid"><label className="panel"><span className="eyebrow">AUDIO · JOURS</span><input name="retentionRecordingDays" type="number" min="1" max="3650" required defaultValue={policy?.retentionRecordingDays ?? 30} /></label><label className="panel"><span className="eyebrow">TRANSCRIPTION · JOURS</span><input name="retentionTranscriptDays" type="number" min="1" max="3650" required defaultValue={policy?.retentionTranscriptDays ?? 30} /></label></div><label className="panel"><span className="eyebrow">SI L’APPELANT REFUSE</span><select name="optOutBehavior" defaultValue={policy?.optOutBehavior ?? "NO_RECORDING_HUMAN_MESSAGE"}><option value="NO_RECORDING_HUMAN_MESSAGE">Continuer sans enregistrement et transmettre un message humain</option><option value="HANG_UP">Mettre fin au flux automatisé</option></select></label><button className="button primary" type="submit">Enregistrer la politique</button></form> : null}
      </section>

      <section className="workspace-section"><div className="workspace-section-heading"><div><span className="eyebrow">ACTIVITÉ</span><h2>Appels récents</h2></div><span>{calls.length}</span></div>{calls.length ? <div className="workspace-list">{calls.map((call) => <article className="workspace-row" key={call.id}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{call.callerPhone ?? "Numéro non disponible"}</span><h2>{formatDateTime(call.startedAt)}</h2></div><StatusPill tone={call.status === "FAILED" ? "warning" : call.status === "CLOSED" ? "good" : "neutral"}>{callStatus(call.status)}</StatusPill></div><div className="workspace-meta"><span><b>Information IA</b>{call.disclosureAt ? "Jouée" : "Non confirmée"}</span><span><b>Information enregistrement</b>{call.recordingNoticeAt ? "Jouée" : "Non confirmée"}</span><span><b>Refus</b>{call.optOutAt ? formatDateTime(call.optOutAt) : "Non enregistré"}</span><span><b>Client ou lead reconnu</b>{call.matchedCustomerId || call.matchedLeadId ? "Oui" : "Non"}</span></div><p className="workspace-description">Conservation prévue jusqu’au {formatDate(call.retentionExpiresAt)}.</p></div></article>)}</div> : <EmptyState title="Aucun appel enregistré" description="Les appels apparaîtront ici après connexion d’un service téléphonique réellement actif." />}</section>
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; const good = result === "saved"; const copy: Record<string, string> = { saved: "La politique a été enregistrée. La vérification de région Europe reste indépendante.", forbidden: "Seuls les propriétaires et administrateurs peuvent modifier cette politique.", invalid: "Les paramètres fournis sont incomplets.", "not-applied": "SESIRA n’a pas pu confirmer cette modification." }; return <section className="premium-inline-notice"><StatusPill tone={good ? "good" : "warning"}>{good ? "Enregistré" : "Non appliqué"}</StatusPill><p>{copy[result] ?? "État inconnu."}</p></section>; }
function callStatus(value: string) { return ({ RECEIVED: "Reçu", DISCLOSED_TO_CALLER: "Information jouée", RECORDED: "Enregistré", OPTED_OUT: "Refus enregistré", TRANSCRIBED: "Transcrit", PROCESSED: "Traité", CLOSED: "Terminé", FAILED: "Échec" } as Record<string, string>)[value] ?? value; }
function optOutLabel(value: string) { return value === "HANG_UP" ? "Fin du flux automatisé" : "Continuer sans enregistrement"; }
function formatDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d); }
function formatDateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d); }
