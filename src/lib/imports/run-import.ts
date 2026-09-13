import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseCsv } from "@/lib/imports/parse-csv";
import {
  customerRowSchema,
  equipmentRowSchema,
  invoiceRowSchema,
  isImportKind,
  maintenanceContractRowSchema,
  quoteRowSchema,
  type EquipmentRow,
  type ImportKind,
  type InvoiceRow,
  type MaintenanceContractRow,
  type QuoteRow,
} from "@/lib/imports/schemas";
import { createClient } from "@/lib/supabase/server";
type Client = SupabaseClient;
type RawRow = Record<string, string>;

type AppliedRow = {
  entityId: string;
  externalId: string;
  entityType:
    | "customer"
    | "quote"
    | "invoice"
    | "equipment"
    | "maintenance_contract";
};

type ApplyResult =
  | { ok: true; applied: AppliedRow }
  | { ok: false; error: string };

type CustomerReference = {
  customer_external_id: string | null;
  customer_external_provider: string | null;
  customer_email: string | null;
};

type QuoteReference = {
  quote_external_id: string | null;
  quote_external_provider: string | null;
  quote_reference: string | null;
};

export type RunImportInput = {
  organizationId: string;
  kind: ImportKind;
  csvText: string;
  sourceFilename: string;
  initiatorUserId: string;
  sourceSizeBytes?: number;
  client?: Client;
};

export type RunImportResult =
  | {
      status: "COMPLETED" | "PARTIAL" | "FAILED";
      importId: string;
      okCount: number;
      errorCount: number;
    }
  | { status: "REJECTED"; reason: string };

function errorMessage(prefix: string, error: { message: string } | null) {
  return error ? `${prefix}: ${error.message}` : `${prefix}: operation failed`;
}

async function resolveCustomerId(
  supabase: Client,
  organizationId: string,
  reference: CustomerReference,
): Promise<{ id: string } | { error: string }> {
  let query = supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId);

  if (reference.customer_external_id) {
    query = query.eq("external_id", reference.customer_external_id);
    if (reference.customer_external_provider) {
      query = query.eq(
        "external_provider",
        reference.customer_external_provider,
      );
    }
  } else if (reference.customer_email) {
    query = query.eq("email", reference.customer_email);
  } else {
    return { error: "customer reference is missing" };
  }

  const lookup = await query.limit(2);
  if (lookup.error) return { error: errorMessage("customer lookup", lookup.error) };

  const rows = (lookup.data ?? []) as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      error:
        "customer not found; import customers first or provide a matching external id/email",
    };
  }
  if (rows.length > 1) {
    return {
      error:
        "customer reference is ambiguous; provide customer_external_provider",
    };
  }
  return { id: rows[0].id };
}

async function resolveQuoteId(
  supabase: Client,
  organizationId: string,
  reference: QuoteReference,
): Promise<{ id: string | null } | { error: string }> {
  const hasReference =
    reference.quote_external_id || reference.quote_reference;
  if (!hasReference) return { id: null };

  let query = supabase
    .from("quotes")
    .select("id")
    .eq("organization_id", organizationId);

  if (reference.quote_external_id) {
    query = query.eq("external_id", reference.quote_external_id);
    if (reference.quote_external_provider) {
      query = query.eq("external_provider", reference.quote_external_provider);
    }
  } else if (reference.quote_reference) {
    query = query.eq("reference", reference.quote_reference);
  }

  const lookup = await query.limit(2);
  if (lookup.error) return { error: errorMessage("quote lookup", lookup.error) };

  const rows = (lookup.data ?? []) as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      error:
        "quote not found; omit the quote columns or import the quote first",
    };
  }
  if (rows.length > 1) {
    return {
      error:
        "quote reference is ambiguous; provide quote_external_provider",
    };
  }
  return { id: rows[0].id };
}

async function applyCustomer(
  supabase: Client,
  organizationId: string,
  raw: RawRow,
  sourceFilename: string,
): Promise<ApplyResult> {
  const validation = customerRowSchema.safeParse(raw);
  if (!validation.success) {
    return { ok: false, error: `validate: ${validation.error.message.slice(0, 400)}` };
  }
  const row = validation.data;

  const existing = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_provider", row.external_provider)
    .eq("external_id", row.external_id)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: errorMessage("customer lookup", existing.error) };
  }
  if (existing.data) {
    return {
      ok: true,
      applied: {
        entityId: (existing.data as { id: string }).id,
        externalId: row.external_id,
        entityType: "customer",
      },
    };
  }

  const insert = await supabase
    .from("customers")
    .insert({
      organization_id: organizationId,
      external_provider: row.external_provider,
      external_id: row.external_id,
      type: row.type,
      display_name: row.display_name,
      company_name: row.company_name,
      email: row.email,
      phone: row.phone,
      metadata: {
        imported_from: "csv",
        import_source_filename: sourceFilename,
      },
    } as never)
    .select("id")
    .single();

  if (insert.error) {
    return { ok: false, error: errorMessage("customer insert", insert.error) };
  }

  return {
    ok: true,
    applied: {
      entityId: (insert.data as { id: string }).id,
      externalId: row.external_id,
      entityType: "customer",
    },
  };
}

async function applyQuote(
  supabase: Client,
  organizationId: string,
  raw: RawRow,
  sourceFilename: string,
): Promise<ApplyResult> {
  const validation = quoteRowSchema.safeParse(raw);
  if (!validation.success) {
    return { ok: false, error: `validate: ${validation.error.message.slice(0, 400)}` };
  }
  const row: QuoteRow = validation.data;

  const customer = await resolveCustomerId(supabase, organizationId, row);
  if ("error" in customer) return { ok: false, error: customer.error };

  const existing = await supabase
    .from("quotes")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_provider", row.external_provider)
    .eq("external_id", row.external_id)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: errorMessage("quote lookup", existing.error) };
  }
  if (existing.data) {
    return {
      ok: true,
      applied: {
        entityId: (existing.data as { id: string }).id,
        externalId: row.external_id,
        entityType: "quote",
      },
    };
  }

  const insert = await supabase
    .from("quotes")
    .insert({
      organization_id: organizationId,
      customer_id: customer.id,
      external_id: row.external_id,
      external_provider: row.external_provider,
      reference: row.reference,
      title: row.title,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      sent_at: row.sent_at,
      expires_at: row.expires_at,
      metadata: {
        imported_from: "csv",
        import_source_filename: sourceFilename,
      },
    } as never)
    .select("id")
    .single();

  if (insert.error) {
    return { ok: false, error: errorMessage("quote insert", insert.error) };
  }

  return {
    ok: true,
    applied: {
      entityId: (insert.data as { id: string }).id,
      externalId: row.external_id,
      entityType: "quote",
    },
  };
}

async function applyInvoice(
  supabase: Client,
  organizationId: string,
  raw: RawRow,
  sourceFilename: string,
): Promise<ApplyResult> {
  const validation = invoiceRowSchema.safeParse(raw);
  if (!validation.success) {
    return { ok: false, error: `validate: ${validation.error.message.slice(0, 400)}` };
  }
  const row: InvoiceRow = validation.data;

  const customer = await resolveCustomerId(supabase, organizationId, row);
  if ("error" in customer) return { ok: false, error: customer.error };

  const quote = await resolveQuoteId(supabase, organizationId, row);
  if ("error" in quote) return { ok: false, error: quote.error };

  const existing = await supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_ref", row.external_ref)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: errorMessage("invoice lookup", existing.error) };
  }
  if (existing.data) {
    return {
      ok: true,
      applied: {
        entityId: (existing.data as { id: string }).id,
        externalId: row.external_ref,
        entityType: "invoice",
      },
    };
  }

  const insert = await supabase
    .from("invoices")
    .insert({
      organization_id: organizationId,
      customer_id: customer.id,
      quote_id: quote.id,
      external_ref: row.external_ref,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      issued_at: row.issued_at,
      due_at: row.due_at,
      paid_at: row.paid_at,
      provenance: {
        source: "csv_import",
        source_filename: sourceFilename,
      },
      metadata: {
        imported_from: "csv",
      },
    } as never)
    .select("id")
    .single();

  if (insert.error) {
    return { ok: false, error: errorMessage("invoice insert", insert.error) };
  }

  return {
    ok: true,
    applied: {
      entityId: (insert.data as { id: string }).id,
      externalId: row.external_ref,
      entityType: "invoice",
    },
  };
}

async function applyEquipment(
  supabase: Client,
  organizationId: string,
  raw: RawRow,
  sourceFilename: string,
): Promise<ApplyResult> {
  const validation = equipmentRowSchema.safeParse(raw);
  if (!validation.success) {
    return { ok: false, error: `validate: ${validation.error.message.slice(0, 400)}` };
  }
  const row: EquipmentRow = validation.data;

  const customer = await resolveCustomerId(supabase, organizationId, row);
  if ("error" in customer) return { ok: false, error: customer.error };

  const existing = await supabase
    .from("equipment")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_ref", row.external_ref)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: errorMessage("equipment lookup", existing.error) };
  }
  if (existing.data) {
    return {
      ok: true,
      applied: {
        entityId: (existing.data as { id: string }).id,
        externalId: row.external_ref,
        entityType: "equipment",
      },
    };
  }

  const insert = await supabase
    .from("equipment")
    .insert({
      organization_id: organizationId,
      customer_id: customer.id,
      external_ref: row.external_ref,
      label: row.label,
      installation_address: row.installation_address,
      equipment_category: row.equipment_category,
      fluid_code: row.fluid_code,
      charge_kg: row.charge_kg,
      is_hermetic: row.is_hermetic,
      is_residential: row.is_residential,
      is_mobile: row.is_mobile,
      has_leak_detector: row.has_leak_detector,
      commissioned_at: row.commissioned_at,
      decommissioned_at: row.decommissioned_at,
      status: row.status,
      provenance: {
        source: "csv_import",
        source_filename: sourceFilename,
      },
      metadata: {
        imported_from: "csv",
      },
    } as never)
    .select("id")
    .single();

  if (insert.error) {
    return { ok: false, error: errorMessage("equipment insert", insert.error) };
  }

  return {
    ok: true,
    applied: {
      entityId: (insert.data as { id: string }).id,
      externalId: row.external_ref,
      entityType: "equipment",
    },
  };
}

async function applyMaintenanceContract(
  supabase: Client,
  organizationId: string,
  raw: RawRow,
  sourceFilename: string,
): Promise<ApplyResult> {
  const validation = maintenanceContractRowSchema.safeParse(raw);
  if (!validation.success) {
    return { ok: false, error: `validate: ${validation.error.message.slice(0, 400)}` };
  }
  const row: MaintenanceContractRow = validation.data;

  const customer = await resolveCustomerId(supabase, organizationId, row);
  if ("error" in customer) return { ok: false, error: customer.error };

  const quote = await resolveQuoteId(supabase, organizationId, row);
  if ("error" in quote) return { ok: false, error: quote.error };

  const existing = await supabase
    .from("maintenance_contracts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_ref", row.external_ref)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return {
      ok: false,
      error: errorMessage("maintenance contract lookup", existing.error),
    };
  }
  if (existing.data) {
    return {
      ok: true,
      applied: {
        entityId: (existing.data as { id: string }).id,
        externalId: row.external_ref,
        entityType: "maintenance_contract",
      },
    };
  }

  const insert = await supabase
    .from("maintenance_contracts")
    .insert({
      organization_id: organizationId,
      customer_id: customer.id,
      quote_id: quote.id,
      title: row.title,
      external_ref: row.external_ref,
      cadence_days: row.cadence_days,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      provenance: {
        source: "csv_import",
        source_filename: sourceFilename,
      },
      metadata: {
        imported_from: "csv",
      },
    } as never)
    .select("id")
    .single();

  if (insert.error) {
    return {
      ok: false,
      error: errorMessage("maintenance contract insert", insert.error),
    };
  }

  return {
    ok: true,
    applied: {
      entityId: (insert.data as { id: string }).id,
      externalId: row.external_ref,
      entityType: "maintenance_contract",
    },
  };
}

async function applyRow(
  kind: ImportKind,
  supabase: Client,
  organizationId: string,
  raw: RawRow,
  sourceFilename: string,
): Promise<ApplyResult> {
  switch (kind) {
    case "customers":
      return applyCustomer(supabase, organizationId, raw, sourceFilename);
    case "quotes":
      return applyQuote(supabase, organizationId, raw, sourceFilename);
    case "invoices":
      return applyInvoice(supabase, organizationId, raw, sourceFilename);
    case "equipment":
      return applyEquipment(supabase, organizationId, raw, sourceFilename);
    case "maintenance_contracts":
      return applyMaintenanceContract(
        supabase,
        organizationId,
        raw,
        sourceFilename,
      );
  }
}

export async function runImport(input: RunImportInput): Promise<RunImportResult> {
  if (!isImportKind(input.kind)) {
    return {
      status: "REJECTED",
      reason: `unsupported import kind: ${input.kind}`,
    };
  }

  const supabase = input.client ?? (await createClient());

  const startedRpc = await supabase.rpc("record_import_started", {
    target_organization_id: input.organizationId,
    target_kind: input.kind,
    target_source_filename: input.sourceFilename,
    target_source_size_bytes: input.sourceSizeBytes ?? null,
    target_initiator_user_id: input.initiatorUserId,
  });
  if (startedRpc.error) {
    return {
      status: "REJECTED",
      reason: `record_import_started: ${startedRpc.error.message}`,
    };
  }
  const importId = startedRpc.data as string;

  const parsed = parseCsv(input.csvText);
  let okCount = 0;
  let errorCount = 0;

  for (const err of parsed.errors) {
    await supabase.rpc("record_import_row_error", {
      target_organization_id: input.organizationId,
      target_import_id: importId,
      target_row_index: err.rowIndex,
      target_error_message: `parse: ${err.message}`,
      target_raw_payload: {} as never,
    });
    errorCount += 1;
  }

  for (let index = 0; index < parsed.rows.length; index += 1) {
    const rowIndex = index + 1;
    const raw = parsed.rows[index];

    let applied: ApplyResult;
    try {
      applied = await applyRow(
        input.kind,
        supabase,
        input.organizationId,
        raw,
        input.sourceFilename,
      );
    } catch (error) {
      applied = {
        ok: false,
        error:
          error instanceof Error
            ? `unexpected: ${error.message.slice(0, 350)}`
            : "unexpected import error",
      };
    }

    if (!applied.ok) {
      await supabase.rpc("record_import_row_error", {
        target_organization_id: input.organizationId,
        target_import_id: importId,
        target_row_index: rowIndex,
        target_error_message: applied.error.slice(0, 400),
        target_raw_payload: raw as never,
      });
      errorCount += 1;
      continue;
    }

    await supabase.rpc("record_import_row_ok", {
      target_organization_id: input.organizationId,
      target_import_id: importId,
      target_row_index: rowIndex,
      target_external_id: applied.applied.externalId,
      target_entity_type: applied.applied.entityType,
      target_entity_id: applied.applied.entityId,
    });
    okCount += 1;
  }

  let finalStatus: "COMPLETED" | "PARTIAL" | "FAILED" = "COMPLETED";
  if (okCount === 0 && errorCount > 0) finalStatus = "FAILED";
  else if (errorCount > 0) finalStatus = "PARTIAL";

  await supabase.rpc("finalize_import", {
    target_organization_id: input.organizationId,
    target_import_id: importId,
    target_status: finalStatus,
    target_error:
      finalStatus === "FAILED" ? "no rows successfully applied" : null,
  });

  return { status: finalStatus, importId, okCount, errorCount };
}
