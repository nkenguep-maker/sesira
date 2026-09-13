"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { importCsvAction } from "@/app/app/imports/actions";
import { PageHeader, StatusPill } from "@/components/sesira/ui";

const MAX_IMPORT_BYTES = 3 * 1024 * 1024;

type ImportKind =
  | "customers"
  | "quotes"
  | "invoices"
  | "equipment"
  | "maintenance_contracts";

type ImportStatus = {
  import?: string;
  kind?: string;
  ok?: string;
  errors?: string;
};

const KIND_CONFIG: Record<
  ImportKind,
  {
    label: string;
    singular: string;
    description: string;
    columns: string;
    template: string;
    dependency: string;
  }
> = {
  customers: {
    label: "Clients",
    singular: "clients",
    description: "Crée le référentiel client qui sert ensuite aux autres imports.",
    columns:
      "external_id, external_provider, type, display_name, company_name, email, phone",
    template: "/templates/imports/clients.csv",
    dependency: "Aucune dépendance",
  },
  quotes: {
    label: "Devis",
    singular: "devis",
    description:
      "Rattache chaque devis à un client existant par identité externe ou e-mail exact.",
    columns:
      "external_id, external_provider, customer_external_id/customer_email, reference, title, amount, currency, status",
    template: "/templates/imports/devis.csv",
    dependency: "Clients d'abord",
  },
  invoices: {
    label: "Factures",
    singular: "factures",
    description:
      "Importe les factures, avec rattachement client obligatoire et devis optionnel.",
    columns:
      "external_ref, customer_external_id/customer_email, quote_external_id/quote_reference, amount, currency, status, issued_at, due_at, paid_at",
    template: "/templates/imports/factures.csv",
    dependency: "Clients · devis optionnel",
  },
  equipment: {
    label: "Équipements",
    singular: "équipements",
    description:
      "Alimente le parc installé et rattache chaque équipement à son client.",
    columns:
      "external_ref, customer_external_id/customer_email, label, installation_address, equipment_category, fluid_code, charge_kg, indicateurs, dates, status",
    template: "/templates/imports/equipements.csv",
    dependency: "Clients d'abord",
  },
  maintenance_contracts: {
    label: "Contrats de maintenance",
    singular: "contrats de maintenance",
    description:
      "Importe les contrats récurrents et conserve le lien vers le client et, si disponible, le devis.",
    columns:
      "external_ref, customer_external_id/customer_email, quote_external_id/quote_reference, title, cadence_days, amount, currency, status, start_date, end_date",
    template: "/templates/imports/maintenance.csv",
    dependency: "Clients · devis optionnel",
  },
};

const IMPORT_ORDER: ImportKind[] = [
  "customers",
  "quotes",
  "invoices",
  "equipment",
  "maintenance_contracts",
];

function asImportKind(value: string | undefined): ImportKind {
  return value && value in KIND_CONFIG ? (value as ImportKind) : "customers";
}

export function PremiumImportExperience({
  view,
  status,
}: {
  view: "home" | "new";
  status?: ImportStatus;
}) {
  return view === "home" ? (
    <ImportHome status={status} />
  ) : (
    <NewImport status={status} />
  );
}

function ImportHome({ status }: { status?: ImportStatus }) {
  return (
    <>
      <PageHeader
        eyebrow="IMPORTS"
        title="Imports"
        description="Reprenez proprement vos données existantes : clients, devis, factures, équipements et contrats de maintenance."
        actions={
          <Link href="/app/imports/new" className="button primary small">
            Nouvel import
          </Link>
        }
      />

      <ImportNotice status={status} />

      <section className="premium-import-hero">
        <div>
          <span className="eyebrow">PÉRIMÈTRE</span>
          <h2>Les données métier essentielles.</h2>
          <p>
            Les relations sont résolues avant l’écriture. SESIRA n’invente ni
            client ni devis lorsqu’une référence ne peut pas être retrouvée de
            façon déterministe.
          </p>
        </div>
        <div className="premium-import-steps">
          <div>
            <span>01</span>
            <strong>Clients</strong>
            <p>Référentiel</p>
          </div>
          <div>
            <span>02</span>
            <strong>Devis</strong>
            <p>Commercial</p>
          </div>
          <div>
            <span>03</span>
            <strong>Factures</strong>
            <p>Finance</p>
          </div>
          <div>
            <span>04</span>
            <strong>Parc & contrats</strong>
            <p>Opérations</p>
          </div>
        </div>
      </section>

      <section className="premium-import-history">
        <div className="premium-section-heading">
          <div>
            <span className="eyebrow">ORDRE CONSEILLÉ</span>
            <h2>Importer sans casser les relations.</h2>
          </div>
          <StatusPill tone="good">5 types disponibles</StatusPill>
        </div>
        <div className="premium-data-list compact">
          {IMPORT_ORDER.map((kind, index) => {
            const config = KIND_CONFIG[kind];
            return (
              <div key={kind}>
                <span>
                  {String(index + 1).padStart(2, "0")} · {config.label}
                </span>
                <strong>{config.dependency}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="premium-import-history">
        <div className="premium-section-heading">
          <div>
            <span className="eyebrow">SÉCURITÉ DES DONNÉES</span>
            <h2>Idempotent, explicite, traçable.</h2>
          </div>
          <StatusPill>Sans doublon silencieux</StatusPill>
        </div>
        <div className="premium-empty-row">
          <span>—</span>
          <div>
            <strong>Une ligne invalide reste une erreur.</strong>
            <p>
              Les identités externes existantes sont réutilisées. Une référence
              client ou devis absente ou ambiguë bloque uniquement la ligne
              concernée et reste visible dans le résultat de l’import.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function NewImport({ status }: { status?: ImportStatus }) {
  const [kind, setKind] = useState<ImportKind>(asImportKind(status?.kind));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => KIND_CONFIG[kind], [kind]);

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
    if (candidate.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setError("Ce fichier dépasse 3 Mo. Aucun fichier n’a été envoyé.");
      return;
    }
    setError(null);
    setFile(candidate);
  }

  function changeKind(nextKind: ImportKind) {
    setKind(nextKind);
    setFile(null);
    setError(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="IMPORTS · NOUVEAU"
        title={`Importer des ${config.singular}`}
        description="Choisissez le type de données. SESIRA valide chaque ligne, résout ses relations et refuse les références ambiguës plutôt que de les deviner."
      />

      <ImportNotice status={status} />

      <section className="premium-import-layout">
        <form action={importCsvAction} className="premium-import-form-card">
          <span className="eyebrow">TYPE DE DONNÉES</span>
          <div className="premium-data-list compact">
            {IMPORT_ORDER.map((candidateKind) => {
              const candidate = KIND_CONFIG[candidateKind];
              const active = candidateKind === kind;
              return (
                <button
                  key={candidateKind}
                  type="button"
                  className={active ? "button primary small" : "button ghost small"}
                  onClick={() => changeKind(candidateKind)}
                  aria-pressed={active}
                >
                  {candidate.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="kind" value={kind} />

          <div className="premium-import-type">
            <div>
              <strong>{config.label}</strong>
              <p>{config.description}</p>
            </div>
            <StatusPill tone="good">Disponible</StatusPill>
          </div>

          <label className="premium-file-field" htmlFor="import-file">
            <span>Fichier à importer</span>
            <input
              id="import-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(event) => choose(event.target.files?.[0])}
            />
            <small>
              CSV · 3 Mo maximum · virgule ou point-virgule · colonnes :{" "}
              {config.columns}
            </small>
          </label>

          <p>
            <Link href={config.template} className="button ghost small">
              Télécharger le modèle CSV
            </Link>
          </p>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          {file ? (
            <div className="premium-selected-file">
              <span className="eyebrow">FICHIER SÉLECTIONNÉ</span>
              <strong>{file.name}</strong>
              <p>{formatBytes(file.size)} · CSV · {config.label}</p>
              <small>
                L’import commence uniquement lorsque vous confirmez ci-dessous.
              </small>
            </div>
          ) : null}

          <div className="premium-import-actions">
            <button
              className="button primary"
              type="submit"
              disabled={!file || Boolean(error)}
            >
              Importer les {config.singular}
            </button>
            <Link className="button ghost" href="/app/imports">
              Annuler
            </Link>
          </div>
        </form>

        <aside className="premium-import-safety">
          <span className="eyebrow">RÈGLES DE RATTACHEMENT</span>
          <h2>Une relation doit être démontrable.</h2>
          <p>
            Le client est retrouvé par identité externe ou e-mail exact. Si le
            fournisseur externe n’est pas fourni et que plusieurs résultats
            existent, la ligne est refusée comme ambiguë.
          </p>
          <div className="premium-data-list compact">
            <div>
              <span>Lecture</span>
              <strong>Serveur</strong>
            </div>
            <div>
              <span>Validation</span>
              <strong>Ligne par ligne</strong>
            </div>
            <div>
              <span>Réimport</span>
              <strong>Identité réutilisée</strong>
            </div>
            <div>
              <span>Dépendances</span>
              <strong>{config.dependency}</strong>
            </div>
            <div>
              <span>Ambiguïté</span>
              <strong>Ligne refusée</strong>
            </div>
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
    const title =
      state === "completed"
        ? "Import terminé"
        : state === "partial"
          ? "Import partiel"
          : "Import en échec";
    const config =
      status?.kind && status.kind in KIND_CONFIG
        ? KIND_CONFIG[status.kind as ImportKind]
        : null;

    return (
      <section className="premium-inline-notice">
        <StatusPill tone={tone}>{title}</StatusPill>
        <p>
          {config ? `${config.label} · ` : ""}
          {ok} ligne{ok > 1 ? "s" : ""} enregistrée{ok > 1 ? "s" : ""} ·{" "}
          {errors} erreur{errors > 1 ? "s" : ""}.
        </p>
      </section>
    );
  }

  const copy: Record<string, string> = {
    "missing-file": "Sélectionnez un fichier CSV avant de lancer l’import.",
    "file-too-large": "Le fichier dépasse la limite de 3 Mo.",
    "invalid-format": "Le fichier fourni n’est pas reconnu comme CSV.",
    "invalid-kind": "Ce type d’import n’est pas pris en charge.",
    forbidden:
      "Votre rôle ne permet pas les imports. Utilisez un compte Owner, Admin ou Manager.",
    rejected:
      "Le serveur a refusé cet import. Aucun succès n’est affiché.",
  };

  return (
    <section className="premium-inline-notice">
      <StatusPill tone="warning">Import non lancé</StatusPill>
      <p>{copy[state] ?? "L’import n’a pas pu être confirmé."}</p>
    </section>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
