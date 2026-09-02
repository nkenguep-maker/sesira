"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader, StatusPill } from "@/components/sesira/ui";

export function PremiumImportExperience({ view }: { view: "home" | "new" }) {
  return view === "home" ? <ImportHome /> : <NewImport />;
}

function ImportHome() {
  return (
    <>
      <PageHeader
        eyebrow="05 · IMPORTS"
        title="Imports"
        description="Ajoutez vos données existantes sans modifier vos dossiers actuels avant validation."
        actions={<Link href="/app/imports/new" className="button primary small">Importer un fichier</Link>}
      />

      <section className="premium-import-hero">
        <div>
          <span className="eyebrow">PREMIER PÉRIMÈTRE</span>
          <h2>Clients et devis.</h2>
          <p>Le flux préparé commence par les données nécessaires au suivi commercial. Le fichier n’est jamais appliqué directement à vos dossiers sans étape d’analyse et de validation.</p>
        </div>
        <div className="premium-import-steps">
          <div><span>01</span><strong>Fichier</strong><p>Sélection locale</p></div>
          <div><span>02</span><strong>Analyse</strong><p>Serveur</p></div>
          <div><span>03</span><strong>Colonnes</strong><p>Mapping</p></div>
          <div><span>04</span><strong>Validation</strong><p>Avant écriture</p></div>
        </div>
      </section>

      <section className="premium-import-history">
        <div className="premium-section-heading">
          <div><span className="eyebrow">HISTORIQUE</span><h2>Les imports apparaîtront ici.</h2></div>
          <StatusPill>Non exposé</StatusPill>
        </div>
        <div className="premium-empty-row">
          <span>—</span>
          <div><strong>Aucun historique inventé.</strong><p>Le serveur actuel ne fournit pas encore le read model d’historique à cette interface.</p></div>
        </div>
      </section>
    </>
  );
}

function NewImport() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(candidate: File | undefined) {
    if (!candidate) return;
    if (!/\.csv$/i.test(candidate.name)) {
      setFile(null);
      setError("Ce format n’est pas accepté dans le périmètre actuel. Aucun fichier n’a été envoyé.");
      return;
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setFile(null);
      setError("Ce fichier dépasse la limite préparée de 25 Mo. Aucun fichier n’a été envoyé.");
      return;
    }
    setError(null);
    setFile(candidate);
  }

  return (
    <>
      <PageHeader
        eyebrow="05 · IMPORTS · NOUVEAU"
        title="Importer vos données"
        description="Commencez par vos clients et devis existants. Le navigateur ne fabrique aucune analyse."
      />

      <section className="premium-import-layout">
        <div className="premium-import-form-card">
          <span className="eyebrow">TYPE DE DONNÉES</span>
          <div className="premium-import-type">
            <div><strong>Clients + devis</strong><p>Le premier périmètre préparé par SESIRA.</p></div>
            <StatusPill>Préparé</StatusPill>
          </div>

          <label className="premium-file-field" htmlFor="import-file">
            <span>Fichier à importer</span>
            <input id="import-file" type="file" accept=".csv,text/csv" onChange={(event) => choose(event.target.files?.[0])} />
            <small>CSV · 25 Mo maximum dans le périmètre actuel</small>
          </label>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          {file ? (
            <div className="premium-selected-file">
              <span className="eyebrow">FICHIER SÉLECTIONNÉ</span>
              <strong>{file.name}</strong>
              <p>{formatBytes(file.size)} · CSV</p>
              <small>Le nombre de lignes et les anomalies ne seront affichés qu’après une analyse serveur réelle.</small>
            </div>
          ) : null}

          <div className="premium-import-actions">
            <button className="button primary" type="button" disabled title="Analyse serveur non exposée dans la branche UI actuelle">Analyser le fichier</button>
            <Link className="button ghost" href="/app/imports">Annuler</Link>
          </div>
        </div>

        <aside className="premium-import-safety">
          <span className="eyebrow">ÉTAT RÉEL</span>
          <h2>Analyse serveur non exposée.</h2>
          <p>La sélection du fichier reste locale. Tant que le endpoint d’analyse et de mapping n’est pas relié à cette interface, rien n’est envoyé ni enregistré.</p>
          <div className="premium-data-list compact">
            <div><span>Lecture du fichier</span><strong>Serveur requis</strong></div>
            <div><span>Mapping</span><strong>Après analyse</strong></div>
            <div><span>Écriture</span><strong>Après validation</strong></div>
          </div>
        </aside>
      </section>
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
