"use client";

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useRef, useState } from "react";

const sections = [
  ["haut", "Haut de page"],
  ["comprendre", "Le problème"],
  ["marche", "Comment ça marche"],
  ["decision", "Ce qui vous revient"],
  ["prix", "Le calcul"],
  ["plateforme", "La suite"],
  ["paul", "Qui est derrière"],
  ["commencer", "Commencer"],
] as const;

const responsibilities = [
  ["Surveiller les devis", "Le prix"],
  ["Ranger les dossiers", "Une remise"],
  ["Écrire le brouillon", "Une réclamation"],
  ["Relancer selon vos règles", "Un litige"],
  ["Voir qu'un client a répondu", "Un contrat"],
  ["Tenir le suivi à jour", "Tout cas inhabituel"],
] as const;

const sources = [
  ["Votre boîte mail", "Prêt", "ready"],
  ["Vos devis", "Prêt", "ready"],
  ["Les demandes reçues", "Prêt", "ready"],
  ["Vos clients", "Prêt", "ready"],
  ["Les messages clients", "En cours", "progress"],
  ["Les documents", "Bientôt", "soon"],
  ["Les factures", "Bientôt", "soon"],
  ["Les interventions", "Bientôt", "soon"],
  ["Votre logiciel métier", "Sur demande", "request"],
] as const;

const principles = [
  ["Vos données", "Votre entreprise a son espace, personne d'autre n'y accède."],
  ["Tout est noté", "Chaque message envoyé est daté, et on sait qui l'a validé."],
  ["Vous décidez", "Les sujets délicats vous reviennent toujours."],
  ["Arrêt immédiat", "Vous coupez une relance ou une connexion quand vous voulez."],
  ["Pannes visibles", "Si quelque chose ne marche pas, on vous le dit."],
] as const;

export function PublicSite() {
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("haut");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-64px 0px -40% 0px", threshold: [0.1, 0.3, 0.6] },
    );
    sections.forEach(([id]) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const openDiagnostic = () => setDiagnosticOpen(true);

  return (
    <div className="landing-ref">
      <LandingHeader onDiagnostic={openDiagnostic} />
      <nav className="lr-markers" aria-label="Repères de page">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-label={label} title={label}>
            <span className={activeSection === id ? "active" : ""} />
          </a>
        ))}
      </nav>
      <main>
        <Hero onDiagnostic={openDiagnostic} />
        <Problem />
        <HowItWorks />
        <Decision onDiagnostic={openDiagnostic} />
        <Pricing onDiagnostic={openDiagnostic} />
        <Platform />
        <Founder />
        <Start onDiagnostic={openDiagnostic} />
      </main>
      <LandingFooter onDiagnostic={openDiagnostic} />
      {diagnosticOpen ? <DiagnosticDialog onClose={() => setDiagnosticOpen(false)} /> : null}
    </div>
  );
}

function LandingHeader({ onDiagnostic }: { onDiagnostic: () => void }) {
  return (
    <header className="lr-header">
      <div className="lr-header-inner">
        <a className="lr-logo" href="#haut">SESIRA<span /></a>
        <nav aria-label="Navigation principale">
          <a className="lr-nav-link" href="#comprendre">Le problème</a>
          <a className="lr-nav-link" href="#marche">Comment ça marche</a>
          <a className="lr-nav-link" href="#prix">Le calcul</a>
          <a className="lr-nav-link" href="#paul">Qui je suis</a>
          <a className="lr-phone" href="tel:+33600000000">06 XX XX XX XX</a>
          <a className="lr-phone-icon" href="tel:+33600000000" aria-label="Appeler Sesira">☎</a>
          <button className="lr-button lr-header-button" onClick={onDiagnostic}><span className="lr-cta-long">Faire le calcul</span><span className="lr-cta-short">Le calcul</span></button>
        </nav>
      </div>
    </header>
  );
}

function Hero({ onDiagnostic }: { onDiagnostic: () => void }) {
  return (
    <section id="haut" className="lr-section lr-hero">
      <div className="lr-container lr-hero-grid">
        <div>
          <p className="lr-kicker">Sesira · chauffage, climatisation, pompes à chaleur</p>
          <h1>Des devis déjà envoyés <span>dorment dans votre boîte mail</span>.</h1>
          <p className="lr-hero-lede">Sesira surveille vos devis. Quand un client ne répond pas, il prépare la relance et vous la montre. Vous décidez, il envoie.</p>
          <p className="lr-hero-note">Vous ne pouvez pas prendre tous les chantiers. Sesira vous aide à ne pas perdre les bons.</p>
          <div className="lr-actions">
            <button className="lr-button" onClick={onDiagnostic}>Voir si c'est rentable chez moi</button>
            <a className="lr-underlink" href="#comprendre">Comprendre en 2 minutes ↓</a>
          </div>
          <p className="lr-micro">Gratuit · 2 minutes · sans engagement</p>
        </div>
        <HeroQuoteCard />
      </div>
    </section>
  );
}

function HeroQuoteCard() {
  return (
    <div className="lr-quote-card">
      <div className="lr-quote-inset" />
      <p className="lr-quote-label">Sesira regarde ce devis</p>
      <h2>Sophie Lefèvre</h2>
      <p className="lr-quote-sub">Pompe à chaleur air/eau · Rhône</p>
      <p className="lr-quote-price">18 450 € HT</p>
      <div className="lr-quote-facts"><p><span>Envoyé</span><b>il y a 3 jours</b></p><p><span>Le client a répondu</span><b>non</b></p></div>
      <div className="lr-quote-alert"><i /><p><b>Aujourd'hui, Sesira relancerait ce client.</b> Il attend votre feu vert.</p></div>
      <div className="lr-quote-tags"><span>Rien n'est parti</span><small>Exemple</small></div>
    </div>
  );
}

function Problem() {
  const flow = ["Le client appelle", "Vous vous déplacez", "Vous chiffrez", "Le devis part"];
  return (
    <section id="comprendre" className="lr-section">
      <div className="lr-container">
        <SectionIntro kicker="Le problème" title="Ce devis, vous l'avez déjà payé.">
          La demande, le déplacement, le rendez-vous, le chiffrage : tout ce travail est fait quand le devis part. Ensuite, souvent, plus rien. Ni oui, ni non.
        </SectionIntro>
        <div className="lr-flow">{flow.map((item) => <span key={item} className="lr-flow-part"><b>{item}</b><i>→</i></span>)}<strong>?</strong></div>
        <div className="lr-problem-grid">
          <div><p className="lr-serif-callout">Ce point d'interrogation, c'est le travail de Sesira.</p><blockquote>« Dans les grandes entreprises où j'ai vendu, ce point d'interrogation n'existe pas. Un logiciel s'en occupe. »<br />— Paul Nkengue, fondateur</blockquote></div>
          <div className="lr-example-card">
            <header><span>Un mois, chez une entreprise comme la vôtre</span><small>Exemple</small></header>
            <div className="lr-example-metrics"><Metric value="47" label="devis suivis" /><Metric value="12" label="qui dorment" /><Metric value="148 000 €" label="en attente" /><Metric value="4" label="à regarder aujourd'hui" /></div>
            <p>Sesira montre d'abord les gros devis et ceux qui attendent depuis le plus longtemps.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function HowItWorks() {
  return (
    <section id="marche" className="lr-section lr-sand">
      <div className="lr-container">
        <SectionIntro kicker="Comment ça marche" title="Rien ne part sans que vous l'ayez lu.">
          Le premier mois, Sesira n'écrit à personne : il regarde, puis il vous montre ce qu'il aurait fait. Vous n'allumez la suite que si ça vous convient.
        </SectionIntro>
        <div className="lr-steps">
          <Step title="1 · Il regarde">Il repère les devis restés sans réponse. Aucun message n'est envoyé.</Step>
          <Step title="2 · Il vous montre">Il vous dit quelle relance il aurait envoyée, et quel jour. Toujours rien d'envoyé.</Step>
          <Step title="3 · Vous validez" selected>Le message est écrit, vous le lisez et vous dites oui, non, ou vous le corrigez.</Step>
          <Step title="4 · Il envoie seul">Seulement si vous l'autorisez, et seulement pour ce que vous avez autorisé.</Step>
        </div>
        <div className="lr-after"><p>Votre logiciel de devis vous aide à faire le devis. Sesira s'occupe de ce qui vient après.</p><p>Les relances partent de votre adresse, aux heures ouvrées, jamais le dimanche. Trois au maximum. Dès qu'un client répond, tout s'arrête.</p></div>
      </div>
    </section>
  );
}

function Step({ title, selected = false, children }: { title: string; selected?: boolean; children: React.ReactNode }) {
  return <article className={selected ? "selected" : ""}><h3>{title}</h3><p>{children}</p>{selected ? <span>Réglage par défaut</span> : null}</article>;
}

function Decision({ onDiagnostic }: { onDiagnostic: () => void }) {
  return (
    <section id="decision" className="lr-section lr-dark">
      <div className="lr-container">
        <SectionIntro kicker="Ce qui vous revient" title="Dès qu'il faut décider, c'est vous.">
          Sesira fait le travail répétitif. Tout ce qui demande un choix vous arrive, avec la raison pour laquelle il vous le montre.
        </SectionIntro>
        <div className="lr-decision-grid">
          <article className="lr-decision-card">
            <header><b>Le client trouve ça trop cher</b><small>Exemple</small></header>
            <div><h3>Sophie Lefèvre</h3><p className="lr-decision-meta">Pompe à chaleur air/eau · 18 450 € HT</p><blockquote>« Nous sommes toujours intéressés, mais le tarif dépasse un peu notre budget. »</blockquote><small>Pourquoi Sesira vous le montre</small><p>Parler d'argent avec un client, ce n'est pas à un logiciel de le faire.</p><div className="lr-actions"><button className="lr-button lr-small" onClick={onDiagnostic}>Voir le devis</button><button className="lr-outline lr-small" onClick={onDiagnostic}>Répondre moi-même</button></div></div>
          </article>
          <div className="lr-responsibilities">
            <header><span>Sesira s'en occupe</span><b>Vous décidez</b></header>
            {responsibilities.map(([sesira, team]) => <p key={sesira}><span>{sesira}</span><b>{team}</b></p>)}
            <h3>Le but n'est pas de vous sortir du circuit. C'est de ne vous laisser que ce qui compte.</h3>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ onDiagnostic }: { onDiagnostic: () => void }) {
  return (
    <section id="prix" className="lr-section">
      <div className="lr-container">
        <SectionIntro kicker="Le calcul" title="Un devis rattrapé tous les deux mois, et Sesira est remboursé.">
          Six devis dans l'année, sur les 540 que vous envoyez. On refait le calcul avec vos chiffres, et le temps que vous gagnez reste à part : il ne vient jamais baisser le prix.
        </SectionIntro>
        <div className="lr-pricing-grid">
          <article className="lr-pricing-card"><header><span>Un exemple</span><small>Chiffres modifiables</small></header><p>45 devis par mois · 12 000 € en moyenne · 30 % de marge · Sesira 1 500 € par mois · 1 200 € d'installation</p><div><p><span>Un devis signé rapporte</span><b>3 600 €</b></p><p><span>Sesira coûte, la première année</span><b>19 200 €</b></p><p><span>Il faut donc rattraper</span><b>6 devis dans l'année</b></p></div></article>
          <div className="lr-pricing-copy"><h3>Vous envoyez 540 devis par an. Il suffit d'en signer 6 de plus pour rembourser la première année.</h3><blockquote>Le calcul exact donne 5,3 devis. On affiche 6, parce qu'on préfère arrondir contre nous.<br />— Paul Nkengue, fondateur, mathématicien de formation</blockquote><div className="lr-time"><span>En plus : environ 30 h par mois que vous ne passez plus à relancer</span><small>Pas compté ci-dessus</small></div><button className="lr-button" onClick={onDiagnostic}>Faire le calcul avec mes chiffres</button><p>Si le calcul dit que ce n'est pas rentable chez vous, on vous le dit.</p></div>
        </div>
      </div>
    </section>
  );
}

function Platform() {
  const items = [
    ["Il trouve ça trop cher", "Devis", "Sophie Lefèvre · 18 450 € HT", "Toujours intéressée, mais le budget ne suit pas.", "À vous de répondre"],
    ["À vérifier", "Document", "Attestation d'entretien · Martin Dupont", "Reçue aujourd'hui, rangée dans le bon dossier.", "Un coup d'œil et c'est validé"],
    ["Pas payée", "Facture", "Résidence Les Tilleuls · 4 850 €", "En retard de 6 jours, sans réponse au premier rappel.", "Vous décidez de la suite"],
  ];
  return (
    <section id="plateforme" className="lr-section lr-dark lr-platform">
      <div className="lr-container lr-wide">
        <SectionIntro kicker="La suite" title="On commence par les devis. Ce n'est pas là que ça s'arrête.">
          Le même principe s'applique ailleurs : Sesira surveille, fait le répétitif, et vous remonte ce qui demande une décision. Tout arrive au même endroit.
        </SectionIntro>
        <div className="lr-platform-grid">
          <div><p className="lr-column-label">Ce qu'il lit</p><div className="lr-sources">{sources.map(([name, state, tone]) => <p className={tone} key={name}><span>{name}</span><small>{state}</small></p>)}</div></div>
          <article className="lr-today"><header><h3>À regarder aujourd'hui · 3</h3><small>Exemple</small></header>{items.map(([reason, type, name, text, action]) => <div key={name}><p><b>{reason}</b><small>{type}</small></p><h4>{name}</h4><span>{text}</span><strong>→ {action}</strong></div>)}</article>
          <div><p className="lr-column-label">Ce que vous recevez</p><div className="lr-receive"><p>Un point chaque semaine</p><p>Ce qui a été envoyé</p><p>Ce que ça a donné</p></div><blockquote>Les chiffres mesurés et les estimations ne sont jamais mélangés.</blockquote></div>
        </div>
        <blockquote className="lr-platform-quote">« J'ai fait de la prospection, de la vente, du service client, du démarrage de chantier et de la relance de factures. Cinq métiers, toujours le même trou. »<br />— Paul Nkengue, fondateur</blockquote>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section id="paul" className="lr-section lr-founder">
      <div className="lr-container">
        <p className="lr-kicker">Qui est derrière Sesira</p>
        <h2>« Les grandes entreprises ne perdent pas de devis par oubli. Elles ont un logiciel pour ça. Vous, non. »</h2>
        <div className="lr-founder-grid">
          <aside><div className="lr-photo">Photo à fournir</div><div className="lr-founder-id"><b>Paul Nkengue · Fondateur</b><p>Mathématicien · plus de 10 ans dans la vente et la sécurité informatique</p><a href="tel:+33600000000">06 XX XX XX XX</a><a href="mailto:paul@sesira.fr">paul@sesira.fr</a></div></aside>
          <div className="lr-founder-story"><p>Pendant plus de dix ans, j'ai travaillé pour de grandes sociétés informatiques : prospection, vente, service client, lancement de contrats, relance de factures impayées. Là-bas, aucun dossier ne se perd. Pas parce que les équipes sont meilleures : un logiciel suit chaque étape.</p><p>Ensuite j'ai accompagné plus de mille entreprises, de dix à deux mille salariés. Beaucoup étaient de votre taille. Aucune n'avait ce logiciel, et toutes avaient le même trou : un devis sans réponse, une demande jamais rappelée, un chantier signé qui ne démarre pas, une facture en retard.</p><p>Je ne connais pas votre métier technique. Mais un devis à vingt mille euros resté six semaines sans réponse, ça je connais très bien. Et je sais à quoi ressemble une relance qui fait fuir un client : c'est pour ça que vous lisez chaque message avant qu'il ne parte.</p><h3>Sesira, c'est ce logiciel des grandes entreprises, à votre échelle. On commence par les devis, parce que c'est là que ça coûte le plus cher.</h3></div>
        </div>
        <div className="lr-principles">{principles.map(([title, text]) => <div key={title}><b>{title}</b><p>{text}</p></div>)}</div>
        <p className="lr-legal">Sesira · raison sociale · SIREN 000 000 000 · adresse · données hébergées en Europe. <a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/conditions">Conditions</a></p>
      </div>
    </section>
  );
}

function Start({ onDiagnostic }: { onDiagnostic: () => void }) {
  const steps = ["On branche Sesira sur vos devis en attente", "Il regarde pendant un mois, sans rien envoyer", "Il note les relances qu'il aurait faites", "On vous montre ce qui dort, depuis quand, pour combien", "Vous allumez, ou vous arrêtez là"];
  return (
    <section id="commencer" className="lr-section lr-dark">
      <div className="lr-container lr-start-grid">
        <div><p className="lr-kicker">Commencer</p><h2>Trente jours sur vos vrais devis.</h2><p className="lr-start-lede">Sesira regarde vos devis en attente et vous montre ce qui dort, depuis quand, et pour combien. Rien n'est envoyé sans vous.</p><div className="lr-start-steps">{steps.map((step, index) => <p key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</p>)}</div><p className="lr-start-note">À la fin, vous avez les chiffres, et une réponse franche : continuer, ou arrêter.</p></div>
        <aside><h3>Voyez d'abord ce que ça donnerait chez vous.</h3><button className="lr-button" onClick={onDiagnostic}>Faire le calcul · 2 minutes</button><button className="lr-outline-dark" onClick={onDiagnostic}>Parler à Paul · 20 minutes</button><p className="lr-micro">Gratuit · sans engagement · sans carte bancaire</p><p className="lr-call">Ou appelez : <a href="tel:+33600000000">06 XX XX XX XX</a></p></aside>
      </div>
    </section>
  );
}

function LandingFooter({ onDiagnostic }: { onDiagnostic: () => void }) {
  return (
    <footer className="lr-footer"><div className="lr-footer-grid"><div><span className="lr-footer-logo">SESIRA</span><p>Votre entreprise,<br />mieux organisée.</p></div><FooterColumn title="Le produit"><a href="#marche">Comment ça marche</a><a href="#plateforme">La suite</a><button onClick={onDiagnostic}>Le calcul</button></FooterColumn><FooterColumn title="Nous joindre"><a href="mailto:paul@sesira.fr">paul@sesira.fr</a><a href="tel:+33600000000">06 XX XX XX XX</a><a href="#paul">Qui je suis</a></FooterColumn><FooterColumn title="Informations"><a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/conditions">Conditions</a></FooterColumn></div><p className="lr-footer-legal">Raison sociale · SIREN 000 000 000 · adresse · données hébergées en Europe</p></footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="lr-footer-column"><p>{title}</p><nav>{children}</nav></div>;
}

function SectionIntro({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return <header className="lr-section-intro"><p className="lr-kicker">{kicker}</p><h2>{title}</h2><p>{children}</p></header>;
}

function DiagnosticDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [values, setValues] = useState({ quotes: 45, amount: 12000, margin: 30, plan: 1500, setup: 1200 });

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, input, a[href]"));
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);

  const marginPerQuote = values.amount * values.margin / 100;
  const annualCost = values.plan * 12 + values.setup;
  const exact = marginPerQuote ? annualCost / marginPerQuote : 0;
  const needed = Math.ceil(exact);
  const annualVolume = values.quotes * 12;
  const impossible = needed > annualVolume;
  const euros = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(value)) + " €";

  return (
    <div className="lr-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="lr-modal" role="dialog" aria-modal="true" aria-labelledby="lr-modal-title">
        <header><div><p>2 minutes</p><h2 id="lr-modal-title">Vos chiffres, le calcul devant vous</h2></div><button ref={closeRef} className="dialog-close" aria-label="Fermer" onClick={onClose}>✕</button></header>
        <div className="lr-modal-grid">
          <div className="lr-sliders">
            <Slider id="v1" label="Devis envoyés par mois" min={5} max={200} step={1} value={values.quotes} display={String(values.quotes)} onChange={(quotes) => setValues({ ...values, quotes })} />
            <Slider id="v2" label="Montant moyen d'un devis" min={1000} max={60000} step={500} value={values.amount} display={euros(values.amount)} onChange={(amount) => setValues({ ...values, amount })} />
            <Slider id="v3" label="Votre marge" min={10} max={60} step={1} value={values.margin} display={`${values.margin} %`} onChange={(margin) => setValues({ ...values, margin })} />
            <Slider id="v4" label="Sesira par mois" min={1500} max={4000} step={100} value={values.plan} display={euros(values.plan)} onChange={(plan) => setValues({ ...values, plan })} />
            <Slider id="v5" label="Installation, une seule fois" min={0} max={6000} step={100} value={values.setup} display={values.setup ? euros(values.setup) : "aucune"} onChange={(setup) => setValues({ ...values, setup })} />
            <p>Le temps que vous ne passez plus à relancer n'entre pas dans ce calcul. On le montre à part.</p>
          </div>
          <div className="lr-modal-result" aria-live="polite">
            <div><small>Ce que ça coûte la première année</small><h3>{euros(annualCost)}</h3><p>Soit {euros(annualCost / 12)} par mois, installation comprise.</p></div>
            <div className="lr-needed"><small>Ce qu'il faut rattraper</small><h3>{impossible ? "Trop pour votre volume" : `${needed} devis`}</h3><p>{impossible ? `Il faudrait signer ${needed} devis de plus, alors que vous n'en envoyez que ${annualVolume} dans l'année.` : `de plus dans l'année, sur les ${annualVolume} que vous envoyez.`}</p><p>Le calcul exact donne {exact.toFixed(1).replace(".", ",")} devis. {!impossible && needed > exact + 0.05 ? `On affiche ${needed}, parce qu'on préfère arrondir contre nous.` : ""}</p></div>
            <div className="lr-modal-facts"><p><span>Un devis signé rapporte</span><b>{euros(marginPerQuote)}</b></p><p><span>Marge suivie chaque mois</span><b>{euros(values.quotes * marginPerQuote)}</b></p></div>
            {impossible || needed > values.quotes ? <div className="lr-alert"><b>À lire avant d'aller plus loin</b><p>Avec ces chiffres, Sesira n'est pas rentable chez vous. On ne va pas vous le vendre. Appelez-nous seulement si votre suivi actuel vous coûte quelque chose qui n'apparaît pas ici.</p></div> : null}
            <div className="lr-not-counted"><span>≈ 30 h · 900 € par mois</span><small>Pas compté</small></div>
            <div className="lr-modal-actions"><button className="lr-button">Parler à Paul · 20 minutes</button><div><button className="lr-outline">Recevoir par e-mail</button><a className="lr-outline" href="tel:+33600000000">Appeler</a></div></div>
            <p className="lr-disclaimer">Calcul fait uniquement avec les chiffres affichés. Ce n'est pas une promesse de résultat.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Slider({ id, label, min, max, step, value, display, onChange }: { id: string; label: string; min: number; max: number; step: number; value: number; display: string; onChange: (value: number) => void }) {
  return <div className="lr-slider"><div><label htmlFor={id}>{label}</label><span>{display}</span></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}
