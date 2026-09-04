"use client";

import Link from "next/link";
import { useState } from "react";

import { importCustomersAction } from "@/app/app/imports/actions";
import { PageHeader, StatusPill } from "@/components/sesira/ui";

type ImportStatus = { import?: string; ok?: string; errors?: string };

export function PremiumImportExperience({ view, status }: { view: "home" | "new"; status?: ImportStatus }) {
  return view === "home" ? <ImportHome status={status} /> : <NewImport status={status} />;
}

function ImportHome({ status }: { status?: ImportStatus }) {
  return (
    <>
      <PageHeader
        eyebrow="IMPORTS"
        title="Imports"
        description="Ajoutez vos clients existants depuis un CSV. Chaque ligne est validée côté serveur avant d’être enregistrée."
        actions={<Link href="/app/imports/new" className="button primary small">Importer des clients</Link>}
      />

      <ImportNotice status={status} />

      <section className="premium-import-hero">
        <div>
          <span className="eyebrow">PÉRIMÈTRE ACTUEL</span>
          <h2>Clients.</h2>
          <p>L’import V1 prend en charge les clients. Les devis ne sont pas présentés comme importables tant qu’un flux serveur dédié n’existe pas.</p>
        </div>
        <div className="premium-import-steps">
          <div><span>01</span><strong>Fichier</strong><p>CSV sélectionné</p></div>
          <div><span>02</span><strong>Lecture</strong><p>Serveur</p></div>
          <div><span>03</span><strong>Validation</strong><p>Ligne par ligne</p></div>
          <div><span>04</span><strong>Enregistrement</strong><p>Clients valides</p></div>
        </div>
      </section>

      <section className="premium-import-history">
        <div className="premium-section-heading">
          <div><span className="eyebrow">RÉSULTAT</span><h2>Un import partiel reste visible comme partiel.</h2></div>
          <StatusPill>Sans succès inventé</StatusPill>
        </div>
        <div className="premium-empty-row">
          <span>—</span>
          <div><strong>Les lignes invalides ne sont pas masquées.</strong><p>SESIRA compte séparément les lignes enregistrées et les lignes en erreur. Un fichier réimporté réutilise l’identité externe existante lorsqu’elle correspond.</p></div>
        </div>
      </section>
    </>
  );
}

function NewImport({ status }: { status?: ImportStatus }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(candidate: File | undefined) {
    if (!candidate) {
      setFile(null);
      return;
    }
    if (!/\.csv$/i.test(candidate.name)) {
      setFile(null);
      setError("Ce format n’est pas accepté. Aucun fichier n’a été envoyé.");
      return;
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setFile(null);
      setError("Ce fichier dépasse 25 Mo. Aucun fichier n’a été envoyé.");
      return;
    }
    setError(null);
    setFile(candidate);
  }

  return (
    <>
      <PageHeader
        eyebrow="IMPORTS · NOUVEAU"
        title="Importer des clients"
        description="Le fichier est lu et validé côté serveur. Les lignes valides sont ensuite enregistrées ; les erreurs restent comptées séparément."
      />

      <ImportNotice status={status} />

      <section className="premium-import-layout">
        <form action={importCustomersAction} className="premium-import-form-card">
          <span className="eyebrow">TYPE DE DONNÉES</span>
          <div className="premium-import-type">
            <div><strong>Clients</strong><p>Le périmètre actuellement pris en charge par le serveur.</p></div>
            <StatusPill tone="good">Disponible</StatusPill>
          </div>

          <label className="premium-file-field" htmlFor="import-file">
            <span>Fichier à importer</span>
            <input id="import-file" name="file" type="file" accept=".csv,text/csv" required onChange={(event) => choose(event.target.files?.[0])} />
            <small>CSV · 25 Mo maximum · colonnes attendues : external_id, display_name, type, email, téléphone selon disponibilité</small>
          </label>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          {file ? (
            <div className="premium-selected-file">
              <span className="eyebrow">FICHIER SÉLECTIONNÉ</span>
              <strong>{file.name}</strong>
              <p>{formatBytes(file.size)} · CSV</p>
              <small>L’import commence uniquement lorsque vous confirmez ci-dessous.</small>
            </div>
          ) : null}

          <div className="premium-import-actions">
            <button className="button primary" type="submit" disabled={!file || Boolean(error)}>Importer les clients</button>
            <Link className="button ghost" href="/app/imports">Annuler</Link>
          </div>
        </form>

        <aside className="premium-import-safety">
          <span className="eyebrow">CE QUI SE PASSE</span>
          <h2>Validation avant chaque écriture.</h2>
          <p>SESIRA lit le CSV sur le serveur, vérifie chaque ligne et n’enregistre que les clients valides. Une erreur sur une ligne n’est pas transformée en succès.</p>
          <div className="premium-data-list compact">
            <div><span>Lecture</span><strong>Serveur</strong></div>
            <div><span>Validation</span><strong>Ligne par ligne</strong></div>
            <div><span>Doublons connus</span><strong>Identité réutilisée</strong></div>
            <div><span>Devis</span><strong>Non pris en charge ici</strong></div>
          </div>
        </aside>
      </section>
    </>
  );
}

function ImportNotice({ status }: { status?: ImportStatus }) {
  const state = status?.import;
  if (!state) return null;
  if (["completed", "partial", "failed"].includes(state)) {
    const ok = Number(status?.ok ?? 0);
    const errors = Number(status?.errors ?? 0);
    const tone = state === "completed" ? "good" : "warning";
    const title = state === "completed" ? "Import terminé" : state === "partial" ? "Import partiel" : "Import en échec";
    return <section className="premium-inline-notice"><StatusPill tone={tone}>{title}</StatusPill><p>{ok} ligne{ok > 1 ? "s" : ""} enregistrée{ok > 1 ? "s" : ""} · {errors} erreur{errors > 1 ? "s" : ""}.</p></section>;
  }
  const copy: Record<string, string> = {
    "missing-file": "Sélectionnez un fichier CSV avant de lancer l’import.",
    "file-too-large": "Le fichier dépasse la limite de 25 Mo.",
    "invalid-format": "Le fichier fourni n’est pas reconnu comme CSV.",
    rejected: "Le serveur a refusé cet import. Aucun succès n’est affiché.",
  };
  return <section className="premium-inline-notice"><StatusPill tone="warning">Import non lancé</StatusPill><p>{copy[state] ?? "L’import n’a pas pu être confirmé."}</p></section>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
