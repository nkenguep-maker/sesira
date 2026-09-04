import { StatusPill } from "@/components/sesira/ui";
import type { FinancingPartnerUiRow, FinancingReferralUiRow } from "@/lib/data/c40-ui";

import {
  configureFinancingPartnerAction,
  initiateFinancingReferralAction,
  transitionFinancingReferralAction,
} from "@/app/app/opportunites/[id]/financing-actions";

type Props = {
  organizationRole: string;
  opportunityId: string;
  customerId: string;
  partners: FinancingPartnerUiRow[];
  referrals: FinancingReferralUiRow[];
};

export function FinancingPanel({ organizationRole, opportunityId, customerId, partners, referrals }: Props) {
  const canConfigure = ["OWNER", "ADMIN"].includes(organizationRole);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">FINANCEMENT CLIENT</span>
          <h2>Signaler un partenaire, avec l’accord du client</h2>
        </div>
        <StatusPill tone={referrals.some((item) => ["INITIATED", "IN_REVIEW"].includes(item.status)) ? "warning" : "neutral"}>
          {referrals.some((item) => ["INITIATED", "IN_REVIEW"].includes(item.status)) ? "En cours" : "Aucun en cours"}
        </StatusPill>
      </div>

      <p className="panel-copy">
        SESIRA peut enregistrer le partenaire indiqué et le statut que vous renseignez. Il ne conseille pas le client, ne compare pas les offres et ne décide jamais d’un financement.
      </p>

      {referrals.length ? (
        <div className="premium-connection-grid">
          {referrals.map((referral) => (
            <article className="premium-connection-card" key={referral.id}>
              <header>
                <div><span className="eyebrow">PARTENAIRE</span><h2>{referral.partnerName}</h2></div>
                <StatusPill tone={statusTone(referral.status)}>{statusLabel(referral.status)}</StatusPill>
              </header>
              <div className="premium-data-list compact">
                <div><span>Signalé</span><strong>{formatDateTime(referral.referredAt)}</strong></div>
                <div><span>Accord client enregistré</span><strong>{formatDateTime(referral.consentRecordedAt)}</strong></div>
                <div><span>Pièces à réunir</span><strong>{referral.checklistCount || "Aucune liste"}</strong></div>
                <div><span>Dernière note</span><strong>{referral.statusNotes ?? "Aucune"}</strong></div>
              </div>

              {!isTerminal(referral.status) ? (
                <form action={transitionFinancingReferralAction} className="workspace-inline-form compact">
                  <input type="hidden" name="opportunityId" value={opportunityId} />
                  <input type="hidden" name="referralId" value={referral.id} />
                  <label>
                    <span>Statut renseigné</span>
                    <select name="newStatus" defaultValue={referral.status}>
                      <option value="INITIATED">Partenaire signalé</option>
                      <option value="IN_REVIEW">En étude</option>
                      <option value="ACCEPTED">Accepté — renseigné par un humain</option>
                      <option value="DECLINED">Refusé — renseigné par un humain</option>
                      <option value="ABANDONED">Abandonné</option>
                    </select>
                  </label>
                  <label><span>Note facultative</span><input name="notes" maxLength={2000} placeholder="Information reçue du client ou du partenaire" /></label>
                  <button className="button ghost small" type="submit">Enregistrer le statut</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {partners.length ? (
        <form action={initiateFinancingReferralAction} className="settings-stack">
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <input type="hidden" name="customerId" value={customerId} />
          <label className="panel">
            <span className="eyebrow">PARTENAIRE</span>
            <select name="partnerId" required defaultValue="">
              <option value="" disabled>Choisir un partenaire</option>
              {partners.map((partner) => <option value={partner.id} key={partner.id}>{partner.name} · {partnerTypeLabel(partner.type)}</option>)}
            </select>
          </label>
          <label className="panel">
            <span className="eyebrow">CE QUE LE CLIENT AUTORISE</span>
            <textarea name="consentScope" required maxLength={1000} defaultValue="Transmission de mes coordonnées au partenaire sélectionné pour qu’il me recontacte." />
          </label>
          <label className="panel">
            <span className="eyebrow">TRACE DE L’ACCORD</span>
            <input name="consentEvidence" maxLength={2000} placeholder="Ex. accord donné par téléphone le 4 septembre" />
          </label>
          <label className="workspace-check-row">
            <input type="checkbox" name="consentConfirmed" value="1" required />
            <span>Je confirme que le client a donné son accord pour cette transmission.</span>
          </label>
          <button type="submit" className="button primary">Signaler ce partenaire</button>
        </form>
      ) : (
        <div className="workspace-boundary-note">
          <StatusPill tone="neutral">Aucun partenaire</StatusPill>
          <p>Ajoutez d’abord un partenaire que votre entreprise utilise réellement. SESIRA n’en propose pas un automatiquement.</p>
        </div>
      )}

      {canConfigure ? (
        <details className="workspace-details">
          <summary>Ajouter un partenaire utilisé par l’entreprise</summary>
          <form action={configureFinancingPartnerAction} className="settings-stack">
            <input type="hidden" name="opportunityId" value={opportunityId} />
            <label className="panel"><span className="eyebrow">NOM</span><input name="name" required maxLength={200} /></label>
            <label className="panel">
              <span className="eyebrow">TYPE</span>
              <select name="partnerType" defaultValue="OTHER">
                <option value="BANK">Banque</option>
                <option value="FINANCE_COMPANY">Société de financement</option>
                <option value="LEASING">Crédit-bail</option>
                <option value="ECO_LOAN_OPERATOR">Opérateur éco-prêt</option>
                <option value="OTHER">Autre</option>
              </select>
            </label>
            <label className="panel"><span className="eyebrow">EMAIL</span><input type="email" name="contactEmail" /></label>
            <label className="panel"><span className="eyebrow">TÉLÉPHONE</span><input name="contactPhone" maxLength={50} /></label>
            <button className="button ghost small" type="submit">Ajouter le partenaire</button>
          </form>
        </details>
      ) : null}
    </section>
  );
}

function isTerminal(status: string) { return ["ACCEPTED", "DECLINED", "ABANDONED"].includes(status); }
function statusTone(status: string): "good" | "warning" | "neutral" { if (status === "ACCEPTED") return "good"; if (["INITIATED", "IN_REVIEW"].includes(status)) return "warning"; return "neutral"; }
function statusLabel(status: string) { return ({ INITIATED: "Partenaire signalé", IN_REVIEW: "En étude", ACCEPTED: "Accepté · renseigné", DECLINED: "Refusé · renseigné", ABANDONED: "Abandonné" } as Record<string, string>)[status] ?? status; }
function partnerTypeLabel(type: string) { return ({ BANK: "Banque", FINANCE_COMPANY: "Société de financement", LEASING: "Crédit-bail", ECO_LOAN_OPERATOR: "Éco-prêt", OTHER: "Autre" } as Record<string, string>)[type] ?? "Partenaire"; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
