"use client";

import Link from "next/link";
import { useState } from "react";

export function ImportExperience({ view }: { view: "home" | "new" }) {
  return view === "home" ? <ImportHome /> : <NewImport />;
}

function ImportsHeader({ label = "Imports" }: { label?: string }) {
  return <header className="imports-header"><Link href="/app" className="imports-brand">SESIRA<span>.</span></Link><span className="imports-file">{label}</span></header>;
}

function ImportHome() {
  return <div className="imports-page"><ImportsHeader /><main className="imports-content"><h1>Imports</h1><p className="imports-lede">Ajoutez vos données existantes sans modifier vos dossiers actuels avant validation.</p><Link href="/app/imports/new" className="imports-primary">Importer un fichier</Link><section className="imports-history"><p className="imports-label">HISTORIQUE</p><div className="imports-blocked"><p>L’historique des imports s’affichera ici quand le serveur l’exposera.</p><span>Aucun import n’est inventé.</span></div></section></main></div>;
}

function NewImport() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const choose = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!/\.csv$/i.test(candidate.name)) {
      setFile(null);
      setError("Ce format n’est pas accepté. Aucun fichier n’a été envoyé.");
      return;
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setFile(null);
      setError("Ce fichier dépasse la taille maximale de 25 Mo.");
      return;
    }
    setError(null);
    setFile(candidate);
  };

  return <div className="imports-page"><ImportsHeader label="Nouvel import" /><main className="imports-content"><p className="imports-step">NOUVEL IMPORT</p><h1>Importer vos données</h1><p className="imports-lede">Commencez par vos clients et devis existants.</p><div className="imports-form"><div><p className="imports-label">TYPE DE DONNÉES</p><div className="imports-type"><b>Clients + devis</b><span>Le périmètre préparé pour ce premier écran.</span></div></div><div><label htmlFor="import-file" className="imports-field-label">Fichier à importer</label><input id="import-file" type="file" accept=".csv,text/csv" onChange={(event) => choose(event.target.files?.[0])} aria-describedby="import-help import-analysis-state" className="imports-file-input" /><p id="import-help" className="imports-help">Format accepté : CSV · Taille maximale indicative : 25 Mo</p>{error ? <p className="imports-error" role="alert">{error}</p> : null}</div>{file ? <div className="imports-file-card"><p className="imports-label">FICHIER SÉLECTIONNÉ</p><b>{file.name}</b><span>{formatBytes(file.size)} · CSV</span><p>Le nombre de lignes sera affiché uniquement après analyse serveur.</p></div> : null}<div className="imports-blocked" id="import-analysis-state"><p className="imports-label copper-label">ANALYSE INDISPONIBLE</p><p>La lecture du fichier se fait sur le serveur. Cette étape sera disponible quand l’analyse d’import sera activée. Rien n’a été envoyé ni enregistré.</p></div><div className="imports-actions"><button type="button" className="imports-primary" disabled title="L’analyse serveur n’est pas encore disponible">Analyser le fichier</button><Link href="/app/imports" className="imports-secondary">Annuler</Link></div></div></main></div>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
