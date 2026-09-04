import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type ReadResult<T> = { status: "OK"; data: T } | { status: "ERROR"; reason: string };

async function looseClient(): Promise<SupabaseClient> {
  return (await createClient()) as unknown as SupabaseClient;
}

export type RegulatoryEquipmentRow = {
  id: string;
  customerId: string;
  label: string;
  externalRef: string | null;
  installationAddress: string | null;
  category: string;
  fluidCode: string | null;
  chargeKg: number | null;
  isHermetic: boolean;
  isMobile: boolean;
  hasLeakDetector: boolean;
  lastLeakCheckAt: string | null;
  status: string;
  nextLeakCheck: null | {
    status: "DUE";
    nextDueAt: string;
    cadenceDays: number;
    ruleCode: string;
    sourceRef: string;
    tco2eq: number;
    detectorDoubled: boolean;
  } | { status: "OUT_OF_SCOPE" } | { status: "UNAVAILABLE" };
};

export type RegulatoryAttentionRow = {
  id: string;
  category: string;
  priority: string;
  entityType: string;
  entityId: string;
  title: string;
  explanation: string | null;
  suggestedAction: string | null;
  seenAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type RegulatoryAttestationRow = {
  id: string;
  kind: string;
  scope: string;
  holderUserId: string | null;
  referenceNumber: string;
  issuedBy: string;
  validFrom: string;
  validUntil: string;
  status: string;
  documentId: string | null;
};

export type RegulatoryExportRow = {
  id: string;
  kind: string;
  referenceYear: number | null;
  interventionId: string | null;
  status: string;
  gapCount: number;
  generatedAt: string;
  exportedAt: string | null;
  exportFormat: string | null;
};

export async function getRegulatoryWorkspace(organizationId: string): Promise<ReadResult<{
  equipment: RegulatoryEquipmentRow[];
  attentions: RegulatoryAttentionRow[];
  attestations: RegulatoryAttestationRow[];
  exports: RegulatoryExportRow[];
}>> {
  const client = await looseClient();
  const [equipmentResult, attentionsResult, attestationsResult, exportsResult] = await Promise.all([
    client.from("equipment").select("id,customer_id,label,external_ref,installation_address,equipment_category,fluid_code,charge_kg,is_hermetic,is_mobile,has_leak_detector,last_leak_check_at,status").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(200),
    client.from("regulatory_attentions").select("id,category,priority,entity_type,entity_id,title,explanation,suggested_action,seen_at,resolved_at,created_at").eq("organization_id", organizationId).is("resolved_at", null).order("created_at", { ascending: false }).limit(200),
    client.from("regulatory_attestations").select("id,attestation_kind,scope,holder_user_id,reference_number,issued_by,valid_from,valid_until,status,document_id").eq("organization_id", organizationId).order("valid_until", { ascending: true }).limit(200),
    client.from("regulatory_exports").select("id,export_kind,reference_year,reference_intervention_id,status,payload_gaps,generated_at,exported_at,export_format").eq("organization_id", organizationId).order("generated_at", { ascending: false }).limit(200),
  ]);
  const error = equipmentResult.error ?? attentionsResult.error ?? attestationsResult.error ?? exportsResult.error;
  if (error) return { status: "ERROR", reason: error.message };

  const equipmentBase = (equipmentResult.data ?? []).map((row) => ({
    id: String(row.id),
    customerId: String(row.customer_id),
    label: String(row.label),
    externalRef: asNullableString(row.external_ref),
    installationAddress: asNullableString(row.installation_address),
    category: String(row.equipment_category),
    fluidCode: asNullableString(row.fluid_code),
    chargeKg: row.charge_kg === null ? null : Number(row.charge_kg),
    isHermetic: Boolean(row.is_hermetic),
    isMobile: Boolean(row.is_mobile),
    hasLeakDetector: Boolean(row.has_leak_detector),
    lastLeakCheckAt: asNullableString(row.last_leak_check_at),
    status: String(row.status),
  }));

  const equipment = await Promise.all(equipmentBase.map(async (row): Promise<RegulatoryEquipmentRow> => {
    const rpc = await client.rpc("compute_next_leak_check_due", {
      target_organization_id: organizationId,
      target_equipment_id: row.id,
      target_at: null,
    });
    if (rpc.error) return { ...row, nextLeakCheck: { status: "UNAVAILABLE" } };
    const first = Array.isArray(rpc.data) ? rpc.data[0] as Record<string, unknown> | undefined : undefined;
    if (!first) return { ...row, nextLeakCheck: { status: "OUT_OF_SCOPE" } };
    return {
      ...row,
      nextLeakCheck: {
        status: "DUE",
        nextDueAt: String(first.next_due_at),
        cadenceDays: Number(first.cadence_days),
        ruleCode: String(first.matched_rule_code),
        sourceRef: String(first.rule_source_ref),
        tco2eq: Number(first.tco2eq_snapshot),
        detectorDoubled: Boolean(first.detector_doubled),
      },
    };
  }));

  return {
    status: "OK",
    data: {
      equipment,
      attentions: (attentionsResult.data ?? []).map((row) => ({
        id: String(row.id), category: String(row.category), priority: String(row.priority), entityType: String(row.entity_type), entityId: String(row.entity_id), title: String(row.title), explanation: asNullableString(row.explanation), suggestedAction: asNullableString(row.suggested_action), seenAt: asNullableString(row.seen_at), resolvedAt: asNullableString(row.resolved_at), createdAt: String(row.created_at),
      })),
      attestations: (attestationsResult.data ?? []).map((row) => ({
        id: String(row.id), kind: String(row.attestation_kind), scope: String(row.scope), holderUserId: asNullableString(row.holder_user_id), referenceNumber: String(row.reference_number), issuedBy: String(row.issued_by), validFrom: String(row.valid_from), validUntil: String(row.valid_until), status: String(row.status), documentId: asNullableString(row.document_id),
      })),
      exports: (exportsResult.data ?? []).map((row) => ({
        id: String(row.id), kind: String(row.export_kind), referenceYear: row.reference_year === null ? null : Number(row.reference_year), interventionId: asNullableString(row.reference_intervention_id), status: String(row.status), gapCount: Array.isArray(row.payload_gaps) ? row.payload_gaps.length : 0, generatedAt: String(row.generated_at), exportedAt: asNullableString(row.exported_at), exportFormat: asNullableString(row.export_format),
      })),
    },
  };
}

export type EInvoiceProviderRow = { id: string; kind: string; label: string; status: string; formats: string[]; activatedAt: string | null };
export type EInvoiceSubmissionRow = { id: string; invoiceId: string; providerKind: string; format: string; status: string; gapCount: number; externalRef: string | null; exportedAt: string | null; submittedAt: string | null; acceptedAt: string | null; rejectedAt: string | null; rejectionReason: string | null };

export async function getEInvoicingWorkspace(organizationId: string): Promise<ReadResult<{ providers: EInvoiceProviderRow[]; submissions: EInvoiceSubmissionRow[] }>> {
  const client = await looseClient();
  const [providers, submissions] = await Promise.all([
    client.from("einvoicing_providers").select("id,provider_kind,label,status,supported_formats,activated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }),
    client.from("einvoicing_submissions").select("id,invoice_id,provider_kind_snapshot,format,status,payload_gaps,external_ref,exported_at,submitted_at,accepted_at,rejected_at,rejection_reason").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(250),
  ]);
  const error = providers.error ?? submissions.error;
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", data: {
    providers: (providers.data ?? []).map((row) => ({ id: String(row.id), kind: String(row.provider_kind), label: String(row.label), status: String(row.status), formats: Array.isArray(row.supported_formats) ? row.supported_formats.map(String) : [], activatedAt: asNullableString(row.activated_at) })),
    submissions: (submissions.data ?? []).map((row) => ({ id: String(row.id), invoiceId: String(row.invoice_id), providerKind: String(row.provider_kind_snapshot), format: String(row.format), status: String(row.status), gapCount: Array.isArray(row.payload_gaps) ? row.payload_gaps.length : 0, externalRef: asNullableString(row.external_ref), exportedAt: asNullableString(row.exported_at), submittedAt: asNullableString(row.submitted_at), acceptedAt: asNullableString(row.accepted_at), rejectedAt: asNullableString(row.rejected_at), rejectionReason: asNullableString(row.rejection_reason) })),
  } };
}

export type FinancingReferralUiRow = { id: string; partnerName: string; status: string; referredAt: string; consentRecordedAt: string; statusNotes: string | null; checklistCount: number };
export type FinancingPartnerUiRow = { id: string; name: string; type: string; status: string };

export async function getFinancingForOpportunity(organizationId: string, opportunityId: string): Promise<ReadResult<{ partners: FinancingPartnerUiRow[]; referrals: FinancingReferralUiRow[] }>> {
  const client = await looseClient();
  const [partners, referrals] = await Promise.all([
    client.from("financing_partners").select("id,name,partner_type,status").eq("organization_id", organizationId).eq("status", "ACTIVE").order("name"),
    client.from("financing_referrals").select("id,partner_id,status,referred_at,consent_recorded_at,status_notes,client_document_checklist").eq("organization_id", organizationId).eq("opportunity_id", opportunityId).order("referred_at", { ascending: false }),
  ]);
  const error = partners.error ?? referrals.error;
  if (error) return { status: "ERROR", reason: error.message };
  const partnerNameById = new Map((partners.data ?? []).map((row) => [String(row.id), String(row.name)] as const));
  return { status: "OK", data: {
    partners: (partners.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), type: String(row.partner_type), status: String(row.status) })),
    referrals: (referrals.data ?? []).map((row) => ({ id: String(row.id), partnerName: partnerNameById.get(String(row.partner_id)) ?? "Partenaire", status: String(row.status), referredAt: String(row.referred_at), consentRecordedAt: String(row.consent_recorded_at), statusNotes: asNullableString(row.status_notes), checklistCount: Array.isArray(row.client_document_checklist) ? row.client_document_checklist.length : 0 })),
  } };
}

export type TechnicianInterventionRow = { interventionId: string; title: string; status: string; customerName: string | null; customerPhone: string | null; address: string; scheduledAt: string | null; durationMinutes: number | null; arrivedAt: string | null; startedAt: string | null; completedAt: string | null };
export type FieldConflictRow = { artifactId: string; interventionId: string; artifactKind: string; capturedAt: string; conflictReason: string | null; uploadedAt: string };

export async function getTechnicianWorkspace(organizationId: string, userId: string, date: string): Promise<ReadResult<{ interventions: TechnicianInterventionRow[]; conflicts: FieldConflictRow[] }>> {
  const client = await looseClient();
  const [day, conflicts] = await Promise.all([
    client.rpc("technician_day", { target_organization_id: organizationId, target_user_id: userId, target_date: date }),
    client.rpc("pending_field_artifact_conflicts", { target_organization_id: organizationId }),
  ]);
  const error = day.error ?? conflicts.error;
  if (error) return { status: "ERROR", reason: error.message };
  const dayRows = Array.isArray(day.data) ? day.data as Array<Record<string, unknown>> : [];
  const conflictRows = Array.isArray(conflicts.data) ? conflicts.data as Array<Record<string, unknown>> : [];
  return { status: "OK", data: {
    interventions: dayRows.map((row) => ({ interventionId: String(row.intervention_id), title: String(row.title), status: String(row.status), customerName: asNullableString(row.customer_display_name), customerPhone: asNullableString(row.customer_phone), address: [row.address_line1, row.address_postal_code, row.address_city].filter(Boolean).map(String).join(" · "), scheduledAt: asNullableString(row.scheduled_at), durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes), arrivedAt: asNullableString(row.arrived_at), startedAt: asNullableString(row.started_at), completedAt: asNullableString(row.completed_at) })),
    conflicts: conflictRows.map((row) => ({ artifactId: String(row.artifact_id), interventionId: String(row.intervention_id), artifactKind: String(row.artifact_kind), capturedAt: String(row.captured_at), conflictReason: asNullableString(row.conflict_reason), uploadedAt: String(row.uploaded_at) })),
  } };
}

export type VoicePolicyUi = { aiDisclosureMessage: string; recordingNoticeMessage: string; retentionRecordingDays: number; retentionTranscriptDays: number; optOutBehavior: string; regionEuropeVerified: boolean; regionVerifiedAt: string | null };
export type VoiceCallUi = { id: string; providerKind: string; callerPhone: string | null; status: string; disclosureAt: string | null; recordingNoticeAt: string | null; optOutAt: string | null; matchedCustomerId: string | null; matchedLeadId: string | null; startedAt: string; endedAt: string | null; retentionExpiresAt: string };

export async function getVoiceWorkspace(organizationId: string): Promise<ReadResult<{ policy: VoicePolicyUi | null; calls: VoiceCallUi[] }>> {
  const client = await looseClient();
  const [policy, calls] = await Promise.all([
    client.from("voice_policies").select("ai_disclosure_message,recording_notice_message,retention_recording_days,retention_transcript_days,opt_out_behavior,region_europe_verified,region_verified_at").eq("organization_id", organizationId).limit(1).maybeSingle(),
    client.from("voice_calls").select("id,provider_kind,caller_phone,status,ai_disclosure_played_at,recording_notice_played_at,opt_out_at,matched_customer_id,matched_lead_id,started_at,ended_at,retention_expires_at").eq("organization_id", organizationId).order("started_at", { ascending: false }).limit(100),
  ]);
  const error = policy.error ?? calls.error;
  if (error) return { status: "ERROR", reason: error.message };
  return { status: "OK", data: {
    policy: policy.data ? { aiDisclosureMessage: String(policy.data.ai_disclosure_message), recordingNoticeMessage: String(policy.data.recording_notice_message), retentionRecordingDays: Number(policy.data.retention_recording_days), retentionTranscriptDays: Number(policy.data.retention_transcript_days), optOutBehavior: String(policy.data.opt_out_behavior), regionEuropeVerified: Boolean(policy.data.region_europe_verified), regionVerifiedAt: asNullableString(policy.data.region_verified_at) } : null,
    calls: (calls.data ?? []).map((row) => ({ id: String(row.id), providerKind: String(row.provider_kind), callerPhone: asNullableString(row.caller_phone), status: String(row.status), disclosureAt: asNullableString(row.ai_disclosure_played_at), recordingNoticeAt: asNullableString(row.recording_notice_played_at), optOutAt: asNullableString(row.opt_out_at), matchedCustomerId: asNullableString(row.matched_customer_id), matchedLeadId: asNullableString(row.matched_lead_id), startedAt: String(row.started_at), endedAt: asNullableString(row.ended_at), retentionExpiresAt: String(row.retention_expires_at) })),
  } };
}

export type PlatformComponentUi = { id: string; kind: string; label: string; provider: string | null; region: string | null; status: string; statusReason: string | null; lastHeartbeatAt: string | null; lastSuccessAt: string | null; lastErrorAt: string | null; lastErrorMessage: string | null; successesLastHour: number; errorsLastHour: number; retriesLastHour: number; avgLatencyMs: number | null; backlogSize: number | null; backlogAgeSeconds: number | null };

export async function getPlatformWorkspace(organizationId: string): Promise<ReadResult<PlatformComponentUi[]>> {
  const client = await looseClient();
  const result = await client.rpc("platform_component_dashboard", { target_organization_id: organizationId });
  if (result.error) return { status: "ERROR", reason: result.error.message };
  const rows = Array.isArray(result.data) ? result.data as Array<Record<string, unknown>> : [];
  return { status: "OK", data: rows.map((row) => ({ id: String(row.component_id), kind: String(row.component_kind), label: String(row.display_label), provider: asNullableString(row.provider_kind), region: asNullableString(row.region), status: String(row.status), statusReason: asNullableString(row.status_reason), lastHeartbeatAt: asNullableString(row.last_heartbeat_at), lastSuccessAt: asNullableString(row.last_success_at), lastErrorAt: asNullableString(row.last_error_at), lastErrorMessage: asNullableString(row.last_error_message), successesLastHour: Number(row.success_count_last_hour ?? 0), errorsLastHour: Number(row.error_count_last_hour ?? 0), retriesLastHour: Number(row.retry_count_last_hour ?? 0), avgLatencyMs: row.avg_latency_ms_last_hour === null ? null : Number(row.avg_latency_ms_last_hour), backlogSize: row.latest_backlog_size === null ? null : Number(row.latest_backlog_size), backlogAgeSeconds: row.latest_backlog_oldest_age_seconds === null ? null : Number(row.latest_backlog_oldest_age_seconds) })) };
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}
