"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SesiraLogo } from "@/components/sesira/logo";

const MONTHLY_PRICE = 1500;
const SETUP_PRICE = 1200;
const FIRST_YEAR_COST = MONTHLY_PRICE * 12 + SETUP_PRICE;

const VOLUMES = [
  { label: "Environ 10", value: 10 },
  { label: "Environ 25", value: 25 },
  { label: "Environ 50", value: 50 },
  { label: "100 ou plus", value: 120 },
] as const;

export function DiagnosticExperience() {
  const [monthlyQuotes, setMonthlyQuotes] = useState<number | null>(null);
  const [refining, setRefining] = useState(false);
  const [averageQuote, setAverageQuote] = useState("");
  const [margin, setMargin] = useState("");

  const annualQuotes = monthlyQuotes ? monthlyQuotes * 12 : null;
  const onePercent = annualQuotes ? Math.max(1, Math.round(annualQuotes * 0.01)) : null;

  const refined = useMemo(() => {
    if (!monthlyQuotes) return null;
    const amount = Number(averageQuote.replace(",", "."));
    const marginPercent = Number(margin.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(marginPercent) || marginPercent <= 0 || marginPercent > 100) return null;

    const marginPerQuote = amount * (marginPercent / 100);
    const exactThreshold = FIRST_YEAR_COST / marginPerQuote;
    const threshold = Math.ceil(exactThreshold);
    const share = (threshold / (monthlyQuotes * 12)) * 100;

    return { amount, marginPercent, marginPerQuote, exactThreshold, threshold, share };
  }, [averageQuote, margin, monthlyQuotes]);

  function selectVolume(value: number) {
    setMonthlyQuotes(value);
    setRefining(false);
    setAverageQuote("");
    setMargin("");
    window.setTimeout(() => document.getElementById("diagnostic-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  return (
    <main className="roi-shell">
      <header className="roi-topbar">
        <Link href="/" aria-label="Retour à SESIRA"><SesiraLogo /></Link>
        <div>
          <span>Calcul de rentabilité CVC</span>
          <Link className="button ghost small" href="/">Retour au site</Link>
        </div>
      </header>

      <section className="roi-hero">
        <div>
          <span className="roi-kicker">1 CHOIX · PREMIER RÉSULTAT IMMÉDIAT</span>
          <h1>Combien de devis envoyez vous <em>chaque mois&nbsp;?</em></h1>
        </div>
        <p>Pas besoin de connaître votre marge ou votre panier moyen pour commencer. Choisissez simplement votre volume approximatif. Vous pourrez affiner ensuite si le premier résultat mérite votre attention.</p>
      </section>

      <section className="roi-volume-section">
        <div className="roi-volume-grid">
          {VOLUMES.map((item) => (
            <button
              className={`roi-volume-choice ${monthlyQuotes === item.value ? "selected" : ""}`}
              type="button"
              key={item.label}
              onClick={() => selectVolume(item.value)}
            >
              <span>{monthlyQuotes === item.value ? "●" : "○"}</span>
              <strong>{item.label}</strong>
              <small>devis par mois</small>
            </button>
          ))}
        </div>
        <p className="roi-volume-note">Une approximation suffit. Le but est de savoir si le suivi mérite un système, pas de produire une prévision comptable.</p>
      </section>

      {monthlyQuotes && annualQuotes && onePercent ? (
        <section id="diagnostic-result" className="roi-result">
          <div className="roi-result-head">
            <span className="roi-kicker">PREMIÈRE LECTURE</span>
            <h2>Vous envoyez environ <em>{formatNumber(annualQuotes)} devis par an.</em></h2>
            <p>À ce volume, le suivi n’est plus seulement une question de mémoire. Un écart de 1 % représente déjà environ {onePercent} {onePercent > 1 ? "dossiers" : "dossier"} sur l’année.</p>
          </div>

          <div className="roi-first-value">
            <div><span>Volume annuel</span><strong>{formatNumber(annualQuotes)}</strong><small>devis surveillables</small></div>
            <div><span>1 % du volume</span><strong>{onePercent}</strong><small>{onePercent > 1 ? "dossiers" : "dossier"}</small></div>
            <div><span>Effort demandé</span><strong>0</strong><small>chiffre exact saisi</small></div>
          </div>

          {!refining ? (
            <div className="roi-refine-cta">
              <div>
                <span className="roi-kicker">OPTIONNEL</span>
                <h3>Vous voulez savoir combien de devis supplémentaires couvriraient SESIRA&nbsp;?</h3>
                <p>Ajoutez seulement deux chiffres : le montant moyen d’un devis et votre marge approximative.</p>
              </div>
              <button className="button primary" type="button" onClick={() => setRefining(true)}>Affiner mon calcul</button>
            </div>
          ) : (
            <div className="roi-refine-panel">
              <div className="roi-refine-copy">
                <span className="roi-kicker">DEUX CHIFFRES · PAS PLUS</span>
                <h3>Calculez votre seuil de rentabilité.</h3>
                <p>SESIRA ne promet pas de récupérer ces devis. Le calcul montre uniquement combien de devis supplémentaires suffiraient à couvrir son coût.</p>
              </div>
              <div className="roi-inputs">
                <label>
                  <span>Montant moyen d’un devis</span>
                  <div><input inputMode="decimal" value={averageQuote} onChange={(event) => setAverageQuote(event.target.value)} placeholder="12000" /><b>€</b></div>
                  <small>Une moyenne approximative suffit</small>
                </label>
                <label>
                  <span>Marge approximative</span>
                  <div><input inputMode="decimal" value={margin} onChange={(event) => setMargin(event.target.value)} placeholder="30" /><b>%</b></div>
                  <small>Votre marge sur un devis signé</small>
                </label>
              </div>

              <div className="roi-price-assumption">
                <span>Hypothèse SESIRA affichée</span>
                <strong>1 500 € / mois + 1 200 € de mise en service</strong>
                <small>Soit {formatEuro(FIRST_YEAR_COST)} la première année. Le prix n’est pas modifiable dans le calcul.</small>
              </div>

              {refined ? (
                <div className="roi-threshold">
                  <div>
                    <span>SEUIL DE RENTABILITÉ</span>
                    <strong>{refined.threshold} {refined.threshold > 1 ? "devis" : "devis"}</strong>
                    <p>supplémentaires sur les {formatNumber(annualQuotes)} devis que vous envoyez dans l’année</p>
                  </div>
                  <div className="roi-threshold-details">
                    <p><span>Marge moyenne par devis</span><b>{formatEuro(refined.marginPerQuote)}</b></p>
                    <p><span>Part du volume annuel</span><b>{formatPercent(refined.share)}</b></p>
                    <p><span>Calcul exact</span><b>{formatNumber(refined.exactThreshold, 1)} devis</b></p>
                  </div>
                </div>
              ) : (
                <p className="roi-waiting">Renseignez ces deux valeurs pour afficher le seuil. Aucun email ni compte n’est demandé.</p>
              )}
            </div>
          )}

          <div className="roi-trust">
            <div><span>01</span><p>Le calcul utilise uniquement les chiffres affichés ici.</p></div>
            <div><span>02</span><p>SESIRA ne prétend pas savoir combien de devis seront réellement gagnés.</p></div>
            <div><span>03</span><p>Si le seuil est trop élevé pour votre volume, le calcul doit le rendre évident.</p></div>
          </div>

          <div className="roi-actions">
            <div>
              <span className="roi-kicker">PROCHAINE ÉTAPE</span>
              <h3>Le calcul vous semble rationnel&nbsp;? Regardons vos vrais devis.</h3>
            </div>
            <div>
              <a className="button primary" href="mailto:paul@sesira.fr?subject=Calcul%20SESIRA%20pour%20mon%20entreprise%20CVC">Parler à Paul</a>
              <Link className="button ghost" href="/login">Connexion</Link>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="roi-footer">
        <SesiraLogo />
        <span>Calcul indicatif. Un seuil de rentabilité n’est pas une promesse de résultat.</span>
      </footer>
    </main>
  );
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimals }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value) + " %";
}
