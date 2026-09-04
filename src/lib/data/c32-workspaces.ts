import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type ReadResult<T> =
  | { status: "OK"; rows: T[] }
  | { status: "ERROR"; reason: string };

export type InterventionRow = {
  id: string;
  customerId: string;
  opportunityId: string | null;
  quoteId: string | null;
  title: string;
  description: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  assignedUserId: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FieldReportRow = {
  id: string;
  interventionId: string;
  technicianUserId: string | null;
  status: string;
  summary: string | null;
  customerFacingSummary: string | null;
  reportGaps: unknown[];
  attachments: unknown[];
  reviewedAt: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  provenance: unknown;
  updatedAt: string;
};

export type DocumentRow = {
  id: string;
  entityType: string | null;
  entityId: string | null;
  fileName: string;
  fileReference: string;
  contentType: string | null;
  sizeBytes: number | null;
  kind: string;
  status: string;
  extractedFields: unknown;
  extractionConfidence: number | null;
  uploadedAt: string;
  classifiedAt: string | null;
  validatedAt: string | null;
};

export type InvoiceRow = {
  id: string;
  customerId: string;
  quoteId: string | null;
  externalRef: string | null;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  reminderStage: number;
  reminderLastSentAt: string | null;
  finalNoticeSentAt: string | null;
  updatedAt: string;
};

export type MaintenanceRow = {
  id: string;
  customerId: string;
  quoteId: string | null;
  title: string;
  externalRef: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  cadenceDays: number;
  lastVisitAt: string | null;
  nextVisitDueAt: string | null;
  renewalNoticeSentAt: string | null;
  amount: number | null;
  currency: string;
};

export type GrowthCampaignRow = {
  id: string;
  name: string;
  channel: string;
  status: string;
  budget: number | null;
  currency: string;
  startAt: string | null;
  endAt: string | null;
  externalRef: string | null;
};

export type LeadRow = {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  source: string;
  sourceCampaignId: string | null;
  status: string;
  qualifiedAt: string | null;
  convertedOpportunityId: string | null;
  createdAt: string;
};

export type ContentPieceRow = {
  id: string;
  title: string;
  kind: string;
  language: string | null;
  status: string;
  bodyDraft: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  provenance: unknown;
  updatedAt: string;
};

export type PublicationRow = {
  id: string;
  contentPieceId: string;
  campaignId: string | null;
  channel: string;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  externalRef: string | null;
  updatedAt: string;
};

export type ConversationRow = {
  id: string;
  campaignId: string | null;
  leadId: string | null;
  channel: string;
  subject: string | null;
  status: string;
  assignedUserId: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  externalThreadRef: string | null;
  updatedAt: string;
};

export type AttributionRow = {
  sourceType: string;
  sourceId: string | null;
  confidence: "OBSERVED" | "ESTIMATED" | "UNKNOWN";
  opportunityCount: number;
  distinctOpportunities: number;
  totalEstimatedValue: number;
  currencyMix: string[];
};

async function looseClient(): Promise<SupabaseClient> {
  return (await createClient()) as SupabaseClient;
}

export async function getInterventionsWorkspace(organizationId: string): Promise<ReadResult<InterventionRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("interventions")
    .select("id,customer_id,opportunity_id,quote_id,title,description,address_line1,address_postal_code,address_city,assigned_user_id,scheduled_at,duration_minutes,status,notes,created_at,updated_at")
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .limit(250);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    customerId: row.customer_id as string,
    opportunityId: row.opportunity_id as string | null,
    quoteId: row.quote_id as string | null,
    title: row.title as string,
    description: row.description as string | null,
    addressLine1: row.address_line1 as string | null,
    addressPostalCode: row.address_postal_code as string | null,
    addressCity: row.address_city as string | null,
    assignedUserId: row.assigned_user_id as string | null,
    scheduledAt: row.scheduled_at as string | null,
    durationMinutes: row.duration_minutes as number | null,
    status: row.status as string,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  })) };
}

export async function getFieldReportsWorkspace(organizationId: string): Promise<ReadResult<FieldReportRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("field_reports")
    .select("id,intervention_id,technician_user_id,status,summary,customer_facing_summary,report_gaps,attachments,reviewed_at,approved_at,sent_at,provenance,updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(250);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    interventionId: row.intervention_id as string,
    technicianUserId: row.technician_user_id as string | null,
    status: row.status as string,
    summary: row.summary as string | null,
    customerFacingSummary: row.customer_facing_summary as string | null,
    reportGaps: Array.isArray(row.report_gaps) ? row.report_gaps : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    reviewedAt: row.reviewed_at as string | null,
    approvedAt: row.approved_at as string | null,
    sentAt: row.sent_at as string | null,
    provenance: row.provenance,
    updatedAt: row.updated_at as string,
  })) };
}

export async function getDocumentsWorkspace(organizationId: string): Promise<ReadResult<DocumentRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("documents")
    .select("id,entity_type,entity_id,file_name,file_reference,content_type,size_bytes,kind,status,extracted_fields,extraction_confidence,uploaded_at,classified_at,validated_at")
    .eq("organization_id", organizationId)
    .order("uploaded_at", { ascending: false })
    .limit(250);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    entityType: row.entity_type as string | null,
    entityId: row.entity_id as string | null,
    fileName: row.file_name as string,
    fileReference: row.file_reference as string,
    contentType: row.content_type as string | null,
    sizeBytes: row.size_bytes as number | null,
    kind: row.kind as string,
    status: row.status as string,
    extractedFields: row.extracted_fields,
    extractionConfidence: row.extraction_confidence as number | null,
    uploadedAt: row.uploaded_at as string,
    classifiedAt: row.classified_at as string | null,
    validatedAt: row.validated_at as string | null,
  })) };
}

export async function getInvoicesWorkspace(organizationId: string): Promise<ReadResult<InvoiceRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("invoices")
    .select("id,customer_id,quote_id,external_ref,amount,currency,status,issued_at,due_at,paid_at,reminder_stage,reminder_last_sent_at,final_notice_sent_at,updated_at")
    .eq("organization_id", organizationId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(250);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    customerId: row.customer_id as string,
    quoteId: row.quote_id as string | null,
    externalRef: row.external_ref as string | null,
    amount: Number(row.amount),
    currency: row.currency as string,
    status: row.status as string,
    issuedAt: row.issued_at as string | null,
    dueAt: row.due_at as string | null,
    paidAt: row.paid_at as string | null,
    reminderStage: Number(row.reminder_stage),
    reminderLastSentAt: row.reminder_last_sent_at as string | null,
    finalNoticeSentAt: row.final_notice_sent_at as string | null,
    updatedAt: row.updated_at as string,
  })) };
}

export async function getMaintenanceWorkspace(organizationId: string): Promise<ReadResult<MaintenanceRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("maintenance_contracts")
    .select("id,customer_id,quote_id,title,external_ref,status,start_date,end_date,cadence_days,last_visit_at,next_visit_due_at,renewal_notice_sent_at,amount,currency")
    .eq("organization_id", organizationId)
    .order("next_visit_due_at", { ascending: true, nullsFirst: false })
    .limit(250);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    customerId: row.customer_id as string,
    quoteId: row.quote_id as string | null,
    title: row.title as string,
    externalRef: row.external_ref as string | null,
    status: row.status as string,
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    cadenceDays: Number(row.cadence_days),
    lastVisitAt: row.last_visit_at as string | null,
    nextVisitDueAt: row.next_visit_due_at as string | null,
    renewalNoticeSentAt: row.renewal_notice_sent_at as string | null,
    amount: row.amount === null ? null : Number(row.amount),
    currency: row.currency as string,
  })) };
}

export async function getGrowthCampaignsWorkspace(organizationId: string): Promise<ReadResult<GrowthCampaignRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("growth_campaigns")
    .select("id,name,channel,status,budget,currency,start_at,end_at,external_ref")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    channel: row.channel as string,
    status: row.status as string,
    budget: row.budget === null ? null : Number(row.budget),
    currency: row.currency as string,
    startAt: row.start_at as string | null,
    endAt: row.end_at as string | null,
    externalRef: row.external_ref as string | null,
  })) };
}

export async function getLeadsWorkspace(organizationId: string): Promise<ReadResult<LeadRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("leads")
    .select("id,contact_name,contact_email,contact_phone,source,source_campaign_id,status,qualified_at,converted_opportunity_id,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    contactName: row.contact_name as string,
    contactEmail: row.contact_email as string | null,
    contactPhone: row.contact_phone as string | null,
    source: row.source as string,
    sourceCampaignId: row.source_campaign_id as string | null,
    status: row.status as string,
    qualifiedAt: row.qualified_at as string | null,
    convertedOpportunityId: row.converted_opportunity_id as string | null,
    createdAt: row.created_at as string,
  })) };
}

export async function getContentWorkspace(organizationId: string): Promise<ReadResult<ContentPieceRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("growth_content_pieces")
    .select("id,title,kind,language,status,body_draft,approved_at,published_at,provenance,updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    kind: row.kind as string,
    language: row.language as string | null,
    status: row.status as string,
    bodyDraft: row.body_draft as string | null,
    approvedAt: row.approved_at as string | null,
    publishedAt: row.published_at as string | null,
    provenance: row.provenance,
    updatedAt: row.updated_at as string,
  })) };
}

export async function getPublicationsWorkspace(organizationId: string): Promise<ReadResult<PublicationRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("growth_publications")
    .select("id,content_piece_id,growth_campaign_id,channel,status,scheduled_for,published_at,external_ref,updated_at")
    .eq("organization_id", organizationId)
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    contentPieceId: row.content_piece_id as string,
    campaignId: row.growth_campaign_id as string | null,
    channel: row.channel as string,
    status: row.status as string,
    scheduledFor: row.scheduled_for as string | null,
    publishedAt: row.published_at as string | null,
    externalRef: row.external_ref as string | null,
    updatedAt: row.updated_at as string,
  })) };
}

export async function getConversationsWorkspace(organizationId: string): Promise<ReadResult<ConversationRow>> {
  const client = await looseClient();
  const { data, error } = await client.from("growth_conversations")
    .select("id,growth_campaign_id,lead_id,channel,subject,status,assigned_user_id,last_inbound_at,last_outbound_at,external_thread_ref,updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row) => ({
    id: row.id as string,
    campaignId: row.growth_campaign_id as string | null,
    leadId: row.lead_id as string | null,
    channel: row.channel as string,
    subject: row.subject as string | null,
    status: row.status as string,
    assignedUserId: row.assigned_user_id as string | null,
    lastInboundAt: row.last_inbound_at as string | null,
    lastOutboundAt: row.last_outbound_at as string | null,
    externalThreadRef: row.external_thread_ref as string | null,
    updatedAt: row.updated_at as string,
  })) };
}

export async function getAttributionWorkspace(organizationId: string, since: Date, until: Date): Promise<ReadResult<AttributionRow>> {
  const client = await looseClient();
  const { data, error } = await client.rpc("attribution_report_by_source", {
    target_organization_id: organizationId,
    target_since: since.toISOString(),
    target_until: until.toISOString(),
  });
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", rows: (data ?? []).map((row: Record<string, unknown>) => ({
    sourceType: String(row.source_type ?? "UNKNOWN"),
    sourceId: row.source_id === null || row.source_id === undefined ? null : String(row.source_id),
    confidence: normalizeConfidence(row.confidence),
    opportunityCount: Number(row.opportunity_count ?? 0),
    distinctOpportunities: Number(row.distinct_opportunities ?? 0),
    totalEstimatedValue: Number(row.total_estimated_value ?? 0),
    currencyMix: Array.isArray(row.currency_mix) ? row.currency_mix.map(String) : [],
  })) };
}

function normalizeConfidence(value: unknown): AttributionRow["confidence"] {
  return value === "OBSERVED" || value === "ESTIMATED" ? value : "UNKNOWN";
}
