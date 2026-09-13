import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentEntityType =
  | "customer"
  | "quote"
  | "opportunity"
  | "intervention"
  | "field_report"
  | "invoice"
  | "maintenance_contract"
  | "equipment";

export type DocumentLinkSource =
  | "EXACT_REFERENCE"
  | "EXACT_CUSTOMER"
  | "DERIVED_RELATION"
  | "HEURISTIC"
  | "MANUAL";

export type DocumentLinkStatus = "SUGGESTED" | "CONFIRMED" | "REJECTED";

export type DocumentLinkCandidate = {
  entityType: DocumentEntityType;
  entityId: string;
  confidence: number;
  source: DocumentLinkSource;
  status: Exclude<DocumentLinkStatus, "REJECTED">;
  reason: string;
  isPrimary: boolean;
  label: string | null;
};

export type DocumentExtraction = {
  kind: "CONTRACT" | "INVOICE" | "PROOF_OF_DELIVERY" | "REGULATORY" | "PHOTO" | "REPORT" | "OTHER";
  confidence: number;
  summary: string;
  customer: {
    name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    external_id: string | null;
    address: string | null;
  } | null;
  references: {
    document_number: string | null;
    invoice_reference: string | null;
    quote_reference: string | null;
    opportunity_reference: string | null;
    intervention_reference: string | null;
    field_report_reference: string | null;
    contract_reference: string | null;
    equipment_reference: string | null;
  };
  dates: {
    document_date: string | null;
    due_date: string | null;
    service_date: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  financial: {
    total_amount: number | null;
    currency: string | null;
  };
  equipment: Array<{
    reference: string | null;
    brand: string | null;
    model: string | null;
    serial: string | null;
    label: string | null;
    location: string | null;
  }>;
  evidence: Array<{ field: string; value: string; excerpt: string }>;
};

type Row = Record<string, unknown>;

type MatchContext = {
  customers: Row[];
  quotes: Row[];
  invoices: Row[];
  contracts: Row[];
  interventions: Row[];
  reports: Row[];
  equipment: Row[];
};

export async function resolveDocumentLinks(
  client: SupabaseClient,
  organizationId: string,
  extraction: DocumentExtraction,
): Promise<DocumentLinkCandidate[]> {
  const [customers, quotes, invoices, contracts, interventions, reports, equipment] = await Promise.all([
    readRows(client, "customers", "id,display_name,company_name,email,phone,external_id", organizationId),
    readRows(client, "quotes", "id,customer_id,reference,external_id,opportunity_id,title,amount,currency", organizationId),
    readRows(client, "invoices", "id,customer_id,quote_id,external_ref,amount,currency,issued_at", organizationId),
    readRows(client, "maintenance_contracts", "id,customer_id,quote_id,external_ref,title,amount,currency,start_date,end_date", organizationId),
    readRows(client, "interventions", "id,customer_id,quote_id,opportunity_id,title,address_line1,address_postal_code,address_city,scheduled_at,metadata", organizationId),
    readRows(client, "field_reports", "id,intervention_id,summary,provenance", organizationId),
    readRows(client, "equipment", "id,customer_id,external_ref,label,installation_address,equipment_category,metadata", organizationId),
  ]);

  const ctx: MatchContext = { customers, quotes, invoices, contracts, interventions, reports, equipment };
  const candidates = new Map<string, DocumentLinkCandidate>();
  const add = (candidate: Omit<DocumentLinkCandidate, "isPrimary">) => {
    const key = `${candidate.entityType}:${candidate.entityId}`;
    const current = candidates.get(key);
    if (!current || candidate.confidence > current.confidence) {
      candidates.set(key, { ...candidate, isPrimary: false });
    }
  };

  const customerMatches = matchCustomers(customers, extraction);
  for (const match of customerMatches) add(match);
  const strongestCustomer = customerMatches.find((item) => item.status === "CONFIRMED") ?? customerMatches[0] ?? null;
  const customerId = strongestCustomer?.entityId ?? null;

  addReferenceMatches(add, extraction.references.invoice_reference, invoices, "invoice", "external_ref", "Facture");
  addReferenceMatches(add, extraction.references.quote_reference, quotes, "quote", "reference", "Devis");
  addReferenceMatches(add, extraction.references.quote_reference, quotes, "quote", "external_id", "Devis");
  addReferenceMatches(add, extraction.references.contract_reference, contracts, "maintenance_contract", "external_ref", "Contrat");
  addReferenceMatches(add, extraction.references.equipment_reference, equipment, "equipment", "external_ref", "Équipement");

  for (const item of extraction.equipment) {
    if (item.reference) addReferenceMatches(add, item.reference, equipment, "equipment", "external_ref", "Équipement");
    if (item.serial) addMetadataReferenceMatches(add, item.serial, equipment, "equipment", "serial", "Équipement");
  }

  if (extraction.references.intervention_reference) {
    addMetadataReferenceMatches(add, extraction.references.intervention_reference, interventions, "intervention", "external_ref", "Intervention");
  }
  if (extraction.references.field_report_reference) {
    addMetadataReferenceMatches(add, extraction.references.field_report_reference, reports, "field_report", "external_ref", "Rapport terrain", "provenance");
  }

  const current = () => [...candidates.values()];
  if (!current().some((item) => item.entityType === "invoice") && extraction.kind === "INVOICE") {
    for (const match of matchInvoiceByBusinessFields(invoices, customerId, extraction)) add(match);
  }
  if (!current().some((item) => item.entityType === "maintenance_contract") && extraction.kind === "CONTRACT") {
    for (const match of matchContractByBusinessFields(contracts, customerId, extraction)) add(match);
  }
  if (!current().some((item) => item.entityType === "intervention") && ["REPORT", "PROOF_OF_DELIVERY", "REGULATORY", "PHOTO"].includes(extraction.kind)) {
    for (const match of matchInterventionByBusinessFields(interventions, customerId, extraction)) add(match);
  }

  deriveRelations(candidates, ctx, extraction.kind);
  markPrimary(candidates, extraction.kind);

  return [...candidates.values()]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.confidence - a.confidence)
    .slice(0, 12);
}

async function readRows(client: SupabaseClient, table: string, select: string, organizationId: string): Promise<Row[]> {
  const { data, error } = await client.from(table).select(select).eq("organization_id", organizationId).limit(1000);
  if (error) throw new Error(`document linking read ${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

function matchCustomers(customers: Row[], extraction: DocumentExtraction): Array<Omit<DocumentLinkCandidate, "isPrimary">> {
  const customer = extraction.customer;
  if (!customer) return [];

  const scored = customers.map((row) => {
    let score = 0;
    let reason = "";
    if (customer.external_id && equalRef(customer.external_id, str(row.external_id))) {
      score = 1;
      reason = "Identifiant client exact lu dans le document";
    }
    if (customer.email && normalizeEmail(customer.email) === normalizeEmail(str(row.email))) {
      if (0.99 > score) {
        score = 0.99;
        reason = "Adresse email client exacte";
      }
    }
    if (customer.phone && normalizePhone(customer.phone) && normalizePhone(customer.phone) === normalizePhone(str(row.phone))) {
      if (0.97 > score) {
        score = 0.97;
        reason = "Numéro de téléphone client exact";
      }
    }

    const extractedNames = [customer.company_name, customer.name].filter(Boolean).map((value) => normalizeName(value!));
    const rowNames = [str(row.company_name), str(row.display_name)].filter(Boolean).map((value) => normalizeName(value));
    const nameScore = bestNameScore(extractedNames, rowNames);
    if (nameScore >= 0.999 && 0.93 > score) {
      score = 0.93;
      reason = "Nom client exact après normalisation";
    } else if (nameScore >= 0.82 && 0.82 > score) {
      score = 0.82;
      reason = "Nom client très proche";
    }

    return { row, score, reason };
  }).filter((item) => item.score >= 0.75)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];
  const uniqueStrong = scored.length === 1 || scored[0].score - scored[1].score >= 0.08;
  const selected = uniqueStrong ? scored.slice(0, 1) : scored.slice(0, 3);

  return selected.map(({ row, score, reason }, index) => ({
    entityType: "customer" as const,
    entityId: str(row.id),
    confidence: score,
    source: score >= 0.93 ? "EXACT_CUSTOMER" as const : "HEURISTIC" as const,
    status: score >= 0.92 && uniqueStrong && index === 0 ? "CONFIRMED" as const : "SUGGESTED" as const,
    reason: uniqueStrong ? reason : `${reason}; plusieurs clients restent plausibles`,
    label: str(row.display_name) || str(row.company_name) || null,
  }));
}

function addReferenceMatches(
  add: (candidate: Omit<DocumentLinkCandidate, "isPrimary">) => void,
  reference: string | null,
  rows: Row[],
  entityType: DocumentEntityType,
  field: string,
  labelPrefix: string,
) {
  if (!reference) return;
  const matches = rows.filter((row) => equalRef(reference, str(row[field])));
  for (const row of matches) {
    add({
      entityType,
      entityId: str(row.id),
      confidence: matches.length === 1 ? 0.995 : 0.86,
      source: "EXACT_REFERENCE",
      status: matches.length === 1 ? "CONFIRMED" : "SUGGESTED",
      reason: matches.length === 1 ? `Référence ${reference} trouvée exactement` : `Référence ${reference} présente sur plusieurs dossiers`,
      label: entityLabel(row, labelPrefix),
    });
  }
}

function addMetadataReferenceMatches(
  add: (candidate: Omit<DocumentLinkCandidate, "isPrimary">) => void,
  reference: string,
  rows: Row[],
  entityType: DocumentEntityType,
  key: string,
  labelPrefix: string,
  metadataField = "metadata",
) {
  const matches = rows.filter((row) => {
    const metadata = object(row[metadataField]);
    return equalRef(reference, str(metadata[key]));
  });
  for (const row of matches) {
    add({
      entityType,
      entityId: str(row.id),
      confidence: matches.length === 1 ? 0.99 : 0.84,
      source: "EXACT_REFERENCE",
      status: matches.length === 1 ? "CONFIRMED" : "SUGGESTED",
      reason: `Référence ${reference} retrouvée dans les métadonnées du dossier`,
      label: entityLabel(row, labelPrefix),
    });
  }
}

function matchInvoiceByBusinessFields(
  rows: Row[],
  customerId: string | null,
  extraction: DocumentExtraction,
): Array<Omit<DocumentLinkCandidate, "isPrimary">> {
  if (!customerId || extraction.financial.total_amount === null) return [];
  const amount = extraction.financial.total_amount;
  const date = extraction.dates.document_date;
  const currency = extraction.financial.currency;
  const matches = rows.filter((row) =>
    str(row.customer_id) === customerId
    && nearlyEqual(num(row.amount), amount)
    && (!currency || str(row.currency).toUpperCase() === currency.toUpperCase())
    && (!date || sameDate(str(row.issued_at), date))
  );
  if (!matches.length) return [];
  return matches.slice(0, 3).map((row) => ({
    entityType: "invoice" as const,
    entityId: str(row.id),
    confidence: matches.length === 1 ? 0.95 : 0.78,
    source: "HEURISTIC" as const,
    status: matches.length === 1 ? "CONFIRMED" as const : "SUGGESTED" as const,
    reason: matches.length === 1
      ? "Client, montant, devise et date correspondent à une facture unique"
      : "Client et montant correspondent à plusieurs factures",
    label: entityLabel(row, "Facture"),
  }));
}

function matchContractByBusinessFields(
  rows: Row[],
  customerId: string | null,
  extraction: DocumentExtraction,
): Array<Omit<DocumentLinkCandidate, "isPrimary">> {
  if (!customerId) return [];
  const amount = extraction.financial.total_amount;
  const start = extraction.dates.start_date;
  const end = extraction.dates.end_date;
  const matches = rows.filter((row) =>
    str(row.customer_id) === customerId
    && (amount === null || nearlyEqual(num(row.amount), amount))
    && (!start || sameDate(str(row.start_date), start))
    && (!end || sameDate(str(row.end_date), end))
  );
  if (!matches.length) return [];
  return matches.slice(0, 3).map((row) => ({
    entityType: "maintenance_contract" as const,
    entityId: str(row.id),
    confidence: matches.length === 1 ? 0.94 : 0.77,
    source: "HEURISTIC" as const,
    status: matches.length === 1 ? "CONFIRMED" as const : "SUGGESTED" as const,
    reason: matches.length === 1 ? "Client et caractéristiques du contrat correspondent à un dossier unique" : "Plusieurs contrats correspondent aux informations lues",
    label: entityLabel(row, "Contrat"),
  }));
}

function matchInterventionByBusinessFields(
  rows: Row[],
  customerId: string | null,
  extraction: DocumentExtraction,
): Array<Omit<DocumentLinkCandidate, "isPrimary">> {
  if (!customerId) return [];
  const serviceDate = extraction.dates.service_date ?? extraction.dates.document_date;
  const address = normalizeName(extraction.customer?.address ?? "");
  let matches = rows.filter((row) => str(row.customer_id) === customerId && (!serviceDate || sameDate(str(row.scheduled_at), serviceDate)));
  if (matches.length > 1 && address) {
    const addressMatches = matches.filter((row) => normalizeName([str(row.address_line1), str(row.address_postal_code), str(row.address_city)].join(" ")).includes(address) || address.includes(normalizeName(str(row.address_line1))));
    if (addressMatches.length) matches = addressMatches;
  }
  if (!matches.length) return [];
  return matches.slice(0, 3).map((row) => ({
    entityType: "intervention" as const,
    entityId: str(row.id),
    confidence: matches.length === 1 ? 0.93 : 0.76,
    source: "HEURISTIC" as const,
    status: matches.length === 1 ? "CONFIRMED" as const : "SUGGESTED" as const,
    reason: matches.length === 1 ? "Client et date d’intervention correspondent à une intervention unique" : "Plusieurs interventions restent compatibles avec le document",
    label: entityLabel(row, "Intervention"),
  }));
}

function deriveRelations(
  candidates: Map<string, DocumentLinkCandidate>,
  ctx: MatchContext,
  kind: DocumentExtraction["kind"],
) {
  const snapshot = () => [...candidates.values()];
  const addDerived = (entityType: DocumentEntityType, entityId: string | null, parent: DocumentLinkCandidate, label: string | null) => {
    if (!entityId) return;
    const key = `${entityType}:${entityId}`;
    const confidence = Math.max(0.5, parent.confidence - 0.01);
    const status = parent.status;
    const next: DocumentLinkCandidate = {
      entityType,
      entityId,
      confidence,
      source: "DERIVED_RELATION",
      status,
      reason: `Relation connue depuis ${entityTypeLabel(parent.entityType)} ${parent.label ?? parent.entityId.slice(0, 8)}`,
      isPrimary: false,
      label,
    };
    const current = candidates.get(key);
    if (!current || next.confidence > current.confidence) candidates.set(key, next);
  };

  for (const candidate of snapshot()) {
    if (candidate.entityType === "invoice") {
      const row = ctx.invoices.find((item) => str(item.id) === candidate.entityId);
      if (row) {
        addDerived("customer", strOrNull(row.customer_id), candidate, customerLabel(ctx.customers, str(row.customer_id)));
        addDerived("quote", strOrNull(row.quote_id), candidate, quoteLabel(ctx.quotes, str(row.quote_id)));
      }
    }
    if (candidate.entityType === "quote") {
      const row = ctx.quotes.find((item) => str(item.id) === candidate.entityId);
      if (row) {
        addDerived("customer", strOrNull(row.customer_id), candidate, customerLabel(ctx.customers, str(row.customer_id)));
        addDerived("opportunity", strOrNull(row.opportunity_id), candidate, "Opportunité");
      }
    }
    if (candidate.entityType === "maintenance_contract") {
      const row = ctx.contracts.find((item) => str(item.id) === candidate.entityId);
      if (row) {
        addDerived("customer", strOrNull(row.customer_id), candidate, customerLabel(ctx.customers, str(row.customer_id)));
        addDerived("quote", strOrNull(row.quote_id), candidate, quoteLabel(ctx.quotes, str(row.quote_id)));
      }
    }
    if (candidate.entityType === "intervention") {
      const row = ctx.interventions.find((item) => str(item.id) === candidate.entityId);
      if (row) {
        addDerived("customer", strOrNull(row.customer_id), candidate, customerLabel(ctx.customers, str(row.customer_id)));
        addDerived("quote", strOrNull(row.quote_id), candidate, quoteLabel(ctx.quotes, str(row.quote_id)));
        addDerived("opportunity", strOrNull(row.opportunity_id), candidate, "Opportunité");
        if (kind === "REPORT") {
          const reports = ctx.reports.filter((item) => str(item.intervention_id) === candidate.entityId);
          if (reports.length === 1) {
            addDerived("field_report", str(reports[0].id), candidate, entityLabel(reports[0], "Rapport terrain"));
          }
        }
      }
    }
    if (candidate.entityType === "field_report") {
      const row = ctx.reports.find((item) => str(item.id) === candidate.entityId);
      if (row) addDerived("intervention", strOrNull(row.intervention_id), candidate, "Intervention");
    }
    if (candidate.entityType === "equipment") {
      const row = ctx.equipment.find((item) => str(item.id) === candidate.entityId);
      if (row) addDerived("customer", strOrNull(row.customer_id), candidate, customerLabel(ctx.customers, str(row.customer_id)));
    }
  }
}

function markPrimary(candidates: Map<string, DocumentLinkCandidate>, kind: DocumentExtraction["kind"]) {
  const priorities: Record<DocumentExtraction["kind"], DocumentEntityType[]> = {
    INVOICE: ["invoice", "quote", "customer", "opportunity"],
    CONTRACT: ["maintenance_contract", "customer", "quote"],
    REPORT: ["field_report", "intervention", "customer", "equipment"],
    PROOF_OF_DELIVERY: ["intervention", "customer", "quote"],
    REGULATORY: ["equipment", "intervention", "customer"],
    PHOTO: ["equipment", "intervention", "customer"],
    OTHER: ["invoice", "quote", "maintenance_contract", "field_report", "intervention", "equipment", "customer", "opportunity"],
  };
  const ordered = [...candidates.values()].sort((a, b) => {
    const p = priorities[kind].indexOf(a.entityType) - priorities[kind].indexOf(b.entityType);
    if (p !== 0) return p;
    if (a.status !== b.status) return a.status === "CONFIRMED" ? -1 : 1;
    return b.confidence - a.confidence;
  });
  const primary = ordered.find((item) => item.confidence >= 0.75);
  if (primary) primary.isPrimary = true;
}

function entityLabel(row: Row, prefix: string) {
  const value = str(row.external_ref) || str(row.reference) || str(row.title) || str(row.label) || str(row.summary);
  return value ? `${prefix} · ${value}` : `${prefix} · ${str(row.id).slice(0, 8)}`;
}
function customerLabel(rows: Row[], id: string) { const row = rows.find((item) => str(item.id) === id); return row ? str(row.display_name) || str(row.company_name) || "Client" : "Client"; }
function quoteLabel(rows: Row[], id: string) { const row = rows.find((item) => str(item.id) === id); return row ? entityLabel(row, "Devis") : "Devis"; }
function entityTypeLabel(type: DocumentEntityType) { return ({ customer: "le client", quote: "le devis", opportunity: "l’opportunité", intervention: "l’intervention", field_report: "le rapport terrain", invoice: "la facture", maintenance_contract: "le contrat", equipment: "l’équipement" } as Record<DocumentEntityType, string>)[type]; }

export function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(sarl|sas|sas u|sasu|sa|eurl|gmbh|ag|ltd|inc|selarl)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
export function normalizePhone(value: string) { return value.replace(/\D/g, "").replace(/^00/, ""); }
export function normalizeReference(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
function equalRef(a: string, b: string) { return Boolean(a && b && normalizeReference(a) === normalizeReference(b)); }
function bestNameScore(left: string[], right: string[]) { let best = 0; for (const a of left) for (const b of right) best = Math.max(best, tokenSimilarity(a, b)); return best; }
function tokenSimilarity(a: string, b: string) { if (!a || !b) return 0; if (a === b) return 1; const aa = new Set(a.split(" ").filter(Boolean)); const bb = new Set(b.split(" ").filter(Boolean)); const intersection = [...aa].filter((item) => bb.has(item)).length; return intersection / Math.max(aa.size, bb.size, 1); }
function nearlyEqual(a: number | null, b: number | null) { return a !== null && b !== null && Math.abs(a - b) <= Math.max(0.02, Math.abs(b) * 0.001); }
function sameDate(a: string, b: string) { if (!a || !b) return false; const aa = new Date(a); const bb = new Date(b); if (Number.isNaN(aa.getTime()) || Number.isNaN(bb.getTime())) return a.slice(0, 10) === b.slice(0, 10); return aa.toISOString().slice(0, 10) === bb.toISOString().slice(0, 10); }
function str(value: unknown) { return typeof value === "string" ? value : ""; }
function strOrNull(value: unknown) { const valueString = str(value); return valueString || null; }
function num(value: unknown) { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && value.trim() !== "") { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; } return null; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
